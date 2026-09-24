const assert = require('assert');
const { buildInsights, buildRecommendation } = require('../src/insights.js');

const now = Date.now();
const base = {
  at: now,
  system: { codexActive: true, claudeActive: false },
  codex: {
    primary: { remainingPercent: 23, resetsAt: Math.floor((now + 3_600_000) / 1000) },
    secondary: { remainingPercent: 56 },
    tokenRatePerMin: 0,
    burnPercentPerMin: 0.7,
    burnSampleMinutes: 4,
    burnDeltaPoints: 2.8,
    lastActivityAt: now - 48_000,
    agents: [{ name: 'developer', model: 'gpt-5.6-sol', reasoningEffort: 'medium', active: false, lastEventAt: now - 48_000 }],
  },
  claude: { tokenRatePerMin: 0, agents: [] },
};

const waiting = buildInsights(base, now);
assert.equal(waiting.mode, 'waiting');
assert.equal(waiting.statusTitle, 'Aperto, ma ora non sta generando');
assert.equal(waiting.quota.level, 'warning');
assert.match(waiting.recommendation.text, /Luna · Low/);
assert.match(waiting.quota.forecastText, /Stima sospesa/);

const working = buildInsights({
  ...base,
  codex: {
    ...base.codex,
    tokenRatePerMin: 125000,
    lastActivityAt: now - 1000,
    agents: [{ ...base.codex.agents[0], active: true, lastEventAt: now - 1000 }],
  },
}, now);
assert.equal(working.mode, 'working');
assert.match(working.quota.forecastText, /circa 33 min/);

const staleRate = buildInsights({
  ...base,
  codex: {
    ...base.codex,
    tokenRatePerMin: 125000,
    lastActivityAt: now - 1000,
    agents: [{ ...base.codex.agents[0], active: false, lastEventAt: now - 1000 }],
  },
}, now);
assert.equal(staleRate.mode, 'waiting', 'a stale token-rate sample is not enough to claim work is active');

const idle = buildInsights({ system: {}, codex: { agents: [] }, claude: { agents: [] } }, now);
assert.equal(idle.mode, 'idle');
assert.equal(buildRecommendation(80, 'gpt-5.6-sol').title, 'Hai margine per lavorare');
assert.equal(buildRecommendation(70, 'gpt-5.6-sol', 'it', { turnCount: 33, compactionCount: 2 }).title, 'Crea un HANDOFF, poi riparti');
assert.match(buildRecommendation(70, 'gpt-5.6-sol', 'it', { turnCount: 33, compactionCount: 2 }).text, /Non pulire la cache/);

const multiAgent = buildInsights({
  system: { codexActive: true },
  codex: {
    primary: { remainingPercent: 29 },
    tokenRatePerMin: 100,
    agents: [
      { model: 'gpt-5.6-sol', lastEventAt: now - 1000, active: true, turnCount: 33, compactionCount: 2 },
      { model: 'codex-auto-review', parentThreadId: 'root-chat', lastEventAt: now, active: true, turnCount: 1, compactionCount: 0 },
    ],
  },
  claude: { agents: [] },
}, now);
assert.equal(multiAgent.recommendation.title, 'Crea un HANDOFF, poi riparti');
assert.match(multiAgent.statusDetail, /1 chat attiva \+ 1 controllo interno · Sol/);
assert.equal(multiAgent.activeChatCount, 1);
assert.equal(multiAgent.activeInternalCount, 1);

console.log('insights.test: OK');
