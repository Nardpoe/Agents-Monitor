const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const MAX_INITIAL_BYTES = 8 * 1024 * 1024;
const ACTIVE_FILE_MS = 20_000;
const DISCOVERY_MS = 2_000;

function safeStat(file) {
  try { return fs.statSync(file); } catch (_) { return null; }
}

function walkRecentJsonl(root, maxAgeMs = 7 * 24 * 3600 * 1000) {
  const out = [];
  if (!root || !fs.existsSync(root)) return out;
  const now = Date.now();
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch (_) { continue; }
    for (const entry of entries) {
      const p = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(p);
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        const st = safeStat(p);
        if (st && now - st.mtimeMs <= maxAgeMs) out.push({ path: p, mtimeMs: st.mtimeMs, size: st.size });
      }
    }
  }
  out.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return out.slice(0, 80);
}

function num(v) { return Number.isFinite(Number(v)) ? Number(v) : 0; }
function recursiveFind(obj, keys, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 6) return undefined;
  for (const k of keys) if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) return obj[k];
  for (const value of Object.values(obj)) {
    const found = recursiveFind(value, keys, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

function emptyUsage() {
  return { input: 0, cached: 0, output: 0, reasoning: 0, total: 0 };
}

class FileCursor {
  constructor(file, kind) {
    this.file = file;
    this.kind = kind;
    this.offset = 0;
    this.partial = '';
    this.initialized = false;
    this.skipFirstPartial = false;
    this.lastMtime = 0;
    this.codex = {
      usage: emptyUsage(),
      primary: null,
      secondary: null,
      model: null,
      reasoningEffort: null,
      sessionId: path.basename(file, '.jsonl'),
      parentThreadId: null,
      agentName: null,
      lastEventAt: 0,
      quotaSamples: [],
      turnCount: 0,
      compactionCount: 0,
      startedAt: 0,
    };
    this.claude = {
      messages: new Map(),
      usage: emptyUsage(),
      model: null,
      sessionId: path.basename(file, '.jsonl'),
      lastEventAt: 0,
    };
  }

  update() {
    const st = safeStat(this.file);
    if (!st) return;
    this.lastMtime = st.mtimeMs;
    if (!this.initialized) {
      this.offset = Math.max(0, st.size - MAX_INITIAL_BYTES);
      this.skipFirstPartial = this.offset > 0;
      this.initialized = true;
    }
    if (st.size < this.offset) {
      this.offset = 0;
      this.partial = '';
    }
    if (st.size === this.offset) return;

    const length = st.size - this.offset;
    const fd = fs.openSync(this.file, 'r');
    const buf = Buffer.alloc(length);
    fs.readSync(fd, buf, 0, length, this.offset);
    fs.closeSync(fd);
    this.offset = st.size;

    let text = this.partial + buf.toString('utf8');
    if (this.skipFirstPartial) {
      const firstNl = text.indexOf('\n');
      if (firstNl >= 0) text = text.slice(firstNl + 1);
      this.skipFirstPartial = false;
    }
    const lines = text.split(/\r?\n/);
    this.partial = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const rec = JSON.parse(line);
        if (this.kind === 'codex') this.parseCodex(rec);
        else this.parseClaude(rec);
      } catch (_) {}
    }
  }

  parseCodex(rec) {
    const payload = rec && rec.payload ? rec.payload : rec;
    const ts = Date.parse(rec.timestamp || payload.timestamp || '') || this.lastMtime || Date.now();
    this.codex.lastEventAt = Math.max(this.codex.lastEventAt, ts);
    if (!this.codex.startedAt) this.codex.startedAt = ts;
    if (rec && rec.type === 'turn_context') this.codex.turnCount += 1;
    if (rec && rec.type === 'compacted') this.codex.compactionCount += 1;

    const model = recursiveFind(rec, ['model']);
    if (typeof model === 'string' && model.length < 100) this.codex.model = model;
    const effort = recursiveFind(rec, ['reasoning_effort', 'reasoningEffort']);
    if (typeof effort === 'string' && effort.length < 30) this.codex.reasoningEffort = effort;
    const sid = recursiveFind(rec, ['thread_id', 'threadId', 'session_id', 'sessionId']);
    if (typeof sid === 'string') this.codex.sessionId = sid;
    const parent = recursiveFind(rec, ['parent_thread_id', 'parentThreadId']);
    if (typeof parent === 'string') this.codex.parentThreadId = parent;
    const nickname = recursiveFind(rec, ['agent_nickname', 'nickname', 'agent_name', 'agentName']);
    const role = recursiveFind(rec, ['agent_role', 'role']);
    if (typeof nickname === 'string' && nickname.length < 80) this.codex.agentName = nickname;
    else if (!this.codex.agentName && typeof role === 'string' && role.length < 80) this.codex.agentName = role;

    if (payload && payload.type === 'token_count') {
      const info = payload.info || {};
      const total = info.total_token_usage || info.totalTokenUsage || {};
      this.codex.usage = {
        input: num(total.input_tokens ?? total.inputTokens),
        cached: num(total.cached_input_tokens ?? total.cachedInputTokens),
        output: num(total.output_tokens ?? total.outputTokens),
        reasoning: num(total.reasoning_output_tokens ?? total.reasoningOutputTokens),
        total: num(total.total_tokens ?? total.totalTokens),
      };
      const rl = payload.rate_limits || payload.rateLimits;
      if (rl) {
        this.codex.primary = normalizeLimit(rl.primary);
        this.codex.secondary = normalizeLimit(rl.secondary);
        if (this.codex.primary) {
          this.codex.quotaSamples.push({ t: ts, usedPercent: this.codex.primary.usedPercent });
          const cutoff = Date.now() - 5 * 60 * 60 * 1000;
          while (this.codex.quotaSamples.length && this.codex.quotaSamples[0].t < cutoff) this.codex.quotaSamples.shift();
        }
      }
    }
  }

  parseClaude(rec) {
    const ts = Date.parse(rec.timestamp || rec.created_at || '') || this.lastMtime || Date.now();
    this.claude.lastEventAt = Math.max(this.claude.lastEventAt, ts);
    const msg = rec && rec.message;
    if (!msg || !msg.usage) return;
    const u = msg.usage;
    const id = msg.id || rec.uuid || `${ts}:${this.claude.messages.size}`;
    const usage = {
      input: num(u.input_tokens),
      cached: num(u.cache_read_input_tokens) + num(u.cache_creation_input_tokens),
      output: num(u.output_tokens),
      reasoning: 0,
      total: num(u.input_tokens) + num(u.cache_read_input_tokens) + num(u.cache_creation_input_tokens) + num(u.output_tokens),
    };
    this.claude.messages.set(id, usage);
    this.claude.model = typeof msg.model === 'string' ? msg.model : this.claude.model;
    const agg = emptyUsage();
    for (const item of this.claude.messages.values()) {
      agg.input += item.input; agg.cached += item.cached; agg.output += item.output; agg.reasoning += item.reasoning; agg.total += item.total;
    }
    this.claude.usage = agg;
  }
}

function normalizeLimit(limit) {
  if (!limit || typeof limit !== 'object') return null;
  const used = Number(limit.used_percent ?? limit.usedPercent);
  if (!Number.isFinite(used)) return null;
  return {
    usedPercent: Math.max(0, Math.min(100, used)),
    remainingPercent: Math.max(0, Math.min(100, 100 - used)),
    windowMinutes: num(limit.window_minutes ?? limit.windowMinutes),
    resetsAt: num(limit.resets_at ?? limit.resetsAt),
  };
}

function detectProcesses() {
  return new Promise(resolve => {
    if (process.platform === 'win32') {
      execFile('tasklist', ['/fo', 'csv', '/nh'], { windowsHide: true, timeout: 1500 }, (err, stdout = '') => {
        const s = stdout.toLowerCase();
        resolve({
          codex: !err && /(^|[\r\n])\"?codex(?:\.exe)?\"?/m.test(s),
          claude: !err && /(^|[\r\n])\"?claude(?:\.exe)?\"?/m.test(s),
        });
      });
    } else {
      execFile('ps', ['-ax', '-o', 'comm=', '-o', 'args='], { timeout: 1500 }, (err, stdout = '') => {
        const lines = stdout.toLowerCase().split(/\r?\n/).filter(Boolean);
        resolve({
          codex: !err && lines.some(l => /(^|[\/\s])codex([\s]|$)/.test(l) && !l.includes('ai-monitor')),
          claude: !err && lines.some(l => /(^|[\/\s])claude([\s]|$)/.test(l) && !l.includes('ai-monitor')),
        });
      });
    }
  });
}

function latestLimit(cursors, key) {
  let best = null;
  for (const c of cursors) {
    const lim = c.codex[key];
    if (!lim) continue;
    const t = c.codex.lastEventAt || c.lastMtime;
    if (!best || t > best.t) best = { ...lim, t };
  }
  if (!best) return null;
  delete best.t;
  return best;
}

class LocalUsageMonitor {
  constructor({ pollMs = 1000, roots = null } = {}) {
    this.pollMs = pollMs;
    this.timer = null;
    this.cursors = new Map();
    this.lastDiscovery = 0;
    this.onSnapshot = () => {};
    this.history = [];
    this.lastProcessState = { codex: false, claude: false };
    this.defaultRoots = {
      codex: path.join(os.homedir(), '.codex', 'sessions'),
      claude: path.join(os.homedir(), '.claude', 'projects'),
    };
    this.roots = { ...this.defaultRoots, ...(roots || {}) };
  }

  setRoots(roots = {}) {
    this.roots = { ...this.defaultRoots, ...roots };
    this.cursors.clear();
    this.lastDiscovery = 0;
  }

  start() {
    if (this.timer) return;
    this.tick();
    this.timer = setInterval(() => this.tick(), this.pollMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  discover() {
    const candidates = [
      ...walkRecentJsonl(this.roots.codex).map(x => ({ ...x, kind: 'codex' })),
      ...walkRecentJsonl(this.roots.claude).map(x => ({ ...x, kind: 'claude' })),
    ];
    for (const item of candidates) {
      if (!this.cursors.has(item.path)) this.cursors.set(item.path, new FileCursor(item.path, item.kind));
    }
    const cutoff = Date.now() - 8 * 24 * 3600 * 1000;
    for (const [file, cursor] of this.cursors) {
      const st = safeStat(file);
      if (!st || st.mtimeMs < cutoff) this.cursors.delete(file);
      else cursor.lastMtime = st.mtimeMs;
    }
  }

  async tick() {
    const now = Date.now();
    if (now - this.lastDiscovery >= DISCOVERY_MS) {
      this.discover();
      this.lastDiscovery = now;
      this.lastProcessState = await detectProcesses();
    }

    for (const cursor of this.cursors.values()) cursor.update();
    const codexCursors = [...this.cursors.values()].filter(c => c.kind === 'codex');
    const claudeCursors = [...this.cursors.values()].filter(c => c.kind === 'claude');

    const primary = latestLimit(codexCursors, 'primary');
    const secondary = latestLimit(codexCursors, 'secondary');
    const quotaHistory = collectQuotaHistory(codexCursors, now);
    const activeWindowMs = 30 * 60 * 1000;
    const activeCodexForUsage = codexCursors.filter(c => now - Math.max(c.lastMtime, c.codex.lastEventAt) < activeWindowMs);
    const activeClaudeForUsage = claudeCursors.filter(c => now - Math.max(c.lastMtime, c.claude.lastEventAt) < activeWindowMs);
    const codexUsage = activeCodexForUsage.reduce((a, c) => addUsage(a, c.codex.usage), emptyUsage());
    const claudeUsage = activeClaudeForUsage.reduce((a, c) => addUsage(a, c.claude.usage), emptyUsage());

    const recentCodex = codexCursors.some(c => now - Math.max(c.lastMtime, c.codex.lastEventAt) < ACTIVE_FILE_MS);
    const recentClaude = claudeCursors.some(c => now - Math.max(c.lastMtime, c.claude.lastEventAt) < ACTIVE_FILE_MS);

    const sample = { t: now, used: primary ? primary.usedPercent : null, codexTotal: codexUsage.total, claudeTotal: claudeUsage.total };
    this.history.push(sample);
    const historyCut = now - 10 * 60 * 1000;
    while (this.history.length && this.history[0].t < historyCut) this.history.shift();

    const burn = calcBurn(this.history);
    const codexTokenRate = calcTokenRate(this.history, 'codexTotal');
    const claudeTokenRate = calcTokenRate(this.history, 'claudeTotal');

    const activeCodexAgents = codexCursors
      .filter(c => now - Math.max(c.lastMtime, c.codex.lastEventAt) < 120_000)
      .sort((a, b) => Math.max(b.lastMtime, b.codex.lastEventAt) - Math.max(a.lastMtime, a.codex.lastEventAt))
      .slice(0, 10)
      .map(c => ({
        id: c.codex.sessionId,
        name: c.codex.agentName || shortId(c.codex.sessionId),
        model: c.codex.model,
        reasoningEffort: c.codex.reasoningEffort,
        parentThreadId: c.codex.parentThreadId,
        usage: c.codex.usage,
        lastEventAt: Math.max(c.lastMtime, c.codex.lastEventAt),
        active: now - Math.max(c.lastMtime, c.codex.lastEventAt) < ACTIVE_FILE_MS,
        turnCount: c.codex.turnCount,
        compactionCount: c.codex.compactionCount,
        startedAt: c.codex.startedAt,
      }));

    const activeClaudeAgents = claudeCursors
      .filter(c => now - Math.max(c.lastMtime, c.claude.lastEventAt) < 120_000)
      .sort((a, b) => Math.max(b.lastMtime, b.claude.lastEventAt) - Math.max(a.lastMtime, a.claude.lastEventAt))
      .slice(0, 10)
      .map(c => ({
        id: c.claude.sessionId,
        name: `Claude ${shortId(c.claude.sessionId)}`,
        model: c.claude.model,
        usage: c.claude.usage,
        lastEventAt: Math.max(c.lastMtime, c.claude.lastEventAt),
        active: now - Math.max(c.lastMtime, c.claude.lastEventAt) < ACTIVE_FILE_MS,
      }));

    this.onSnapshot({
      at: now,
      system: {
        codexActive: this.lastProcessState.codex || recentCodex,
        claudeActive: this.lastProcessState.claude || recentClaude,
      },
      sources: {
        codex: { path: this.roots.codex, exists: fs.existsSync(this.roots.codex), files: codexCursors.length },
        claude: { path: this.roots.claude, exists: fs.existsSync(this.roots.claude), files: claudeCursors.length },
      },
      codex: {
        primary,
        secondary,
        usage: codexUsage,
        tokenRatePerMin: codexTokenRate,
        burnPercentPerMin: burn.rate,
        burnSampleMinutes: burn.sampleMinutes,
        burnDeltaPoints: burn.delta,
        quotaHistory,
        lastActivityAt: activeCodexAgents[0] ? activeCodexAgents[0].lastEventAt : null,
        agents: activeCodexAgents,
      },
      claude: {
        usage: claudeUsage,
        tokenRatePerMin: claudeTokenRate,
        lastActivityAt: activeClaudeAgents[0] ? activeClaudeAgents[0].lastEventAt : null,
        agents: activeClaudeAgents,
      },
    });
  }
}

function collectQuotaHistory(cursors, now) {
  const cutoff = now - 5 * 60 * 60 * 1000;
  const buckets = new Map();
  for (const cursor of cursors) {
    for (const sample of cursor.codex.quotaSamples || []) {
      if (sample.t < cutoff || !Number.isFinite(sample.usedPercent)) continue;
      const bucket = Math.floor(sample.t / 60_000) * 60_000;
      const current = buckets.get(bucket);
      if (!current || sample.t > current.sourceTime) buckets.set(bucket, { t: bucket, usedPercent: sample.usedPercent, sourceTime: sample.t });
    }
  }
  return [...buckets.values()].sort((a, b) => a.t - b.t).map(({ t, usedPercent }) => ({ t, usedPercent }));
}

function addUsage(a, b) {
  return {
    input: a.input + b.input,
    cached: a.cached + b.cached,
    output: a.output + b.output,
    reasoning: a.reasoning + b.reasoning,
    total: a.total + b.total,
  };
}

function calcBurn(history) {
  const valid = history.filter(x => x.used != null);
  if (valid.length < 2) return { rate: 0, sampleMinutes: 0, delta: 0 };
  const last = valid[valid.length - 1];
  const minT = last.t - 5 * 60 * 1000;
  const first = valid.find(x => x.t >= minT) || valid[0];
  if (last.used < first.used) return { rate: 0, sampleMinutes: 0, delta: 0 };
  const mins = Math.max((last.t - first.t) / 60000, 1 / 60);
  const delta = last.used - first.used;
  return { rate: delta / mins, sampleMinutes: mins, delta };
}

function calcTokenRate(history, key) {
  if (history.length < 2) return 0;
  const last = history[history.length - 1];
  const minT = last.t - 60_000;
  const first = history.find(x => x.t >= minT) || history[0];
  const delta = Math.max(0, num(last[key]) - num(first[key]));
  const mins = Math.max((last.t - first.t) / 60000, 1 / 60);
  return delta / mins;
}

function shortId(value) {
  if (!value) return 'session';
  const s = String(value);
  return s.length > 10 ? s.slice(-8) : s;
}

module.exports = { LocalUsageMonitor };
