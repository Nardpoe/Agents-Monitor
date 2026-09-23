const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { LocalUsageMonitor } = require('../src/monitor.cjs');

(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-monitor-test-'));
  const codexDir = path.join(root, 'codex');
  const claudeDir = path.join(root, 'claude');
  fs.mkdirSync(codexDir, { recursive: true });
  fs.mkdirSync(claudeDir, { recursive: true });

  const codexFile = path.join(codexDir, 'rollout-test.jsonl');
  fs.writeFileSync(codexFile, [
    JSON.stringify({ timestamp: new Date().toISOString(), type: 'session_meta', payload: { thread_id: 'root-123', model: 'gpt-test', reasoning_effort: 'medium' } }),
    JSON.stringify({ timestamp: new Date().toISOString(), type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 1000, cached_input_tokens: 700, output_tokens: 100, reasoning_output_tokens: 20, total_tokens: 1100 } }, rate_limits: { primary: { used_percent: 40, window_minutes: 300 }, secondary: { used_percent: 10, window_minutes: 10080 } } } })
  ].join('\n') + '\n');

  const claudeFile = path.join(claudeDir, 'session-test.jsonl');
  fs.writeFileSync(claudeFile, [
    JSON.stringify({ timestamp: new Date().toISOString(), type: 'assistant', message: { id: 'msg-1', model: 'claude-test', usage: { input_tokens: 200, output_tokens: 50, cache_read_input_tokens: 100, cache_creation_input_tokens: 20 } } }),
    JSON.stringify({ timestamp: new Date().toISOString(), type: 'assistant', message: { id: 'msg-2', model: 'claude-test', usage: { input_tokens: 300, output_tokens: 70, cache_read_input_tokens: 120, cache_creation_input_tokens: 10 } } })
  ].join('\n') + '\n');

  const monitor = new LocalUsageMonitor({ roots: { codex: codexDir, claude: claudeDir } });
  let snapshot;
  monitor.onSnapshot = s => { snapshot = s; };
  await monitor.tick();

  assert(snapshot, 'snapshot missing');
  assert.equal(snapshot.codex.primary.remainingPercent, 60);
  assert.equal(snapshot.codex.secondary.remainingPercent, 90);
  assert.equal(snapshot.codex.usage.total, 1100);
  assert.equal(snapshot.claude.usage.total, 870);
  assert.equal(snapshot.codex.agents.length, 1);
  assert.equal(snapshot.claude.agents.length, 1);
  assert.equal(snapshot.codex.agents[0].reasoningEffort, 'medium');
  assert(snapshot.codex.agents[0].lastEventAt > 0);
  assert.equal(typeof snapshot.codex.burnSampleMinutes, 'number');
  assert.equal(snapshot.codex.quotaHistory.length, 1);
  assert.equal(snapshot.codex.quotaHistory[0].usedPercent, 40);

  fs.appendFileSync(codexFile, JSON.stringify({ timestamp: new Date().toISOString(), type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 1500, cached_input_tokens: 900, output_tokens: 130, reasoning_output_tokens: 25, total_tokens: 1630 } }, rate_limits: { primary: { used_percent: 42, window_minutes: 300 }, secondary: { used_percent: 11, window_minutes: 10080 } } } }) + '\n');
  await new Promise(r => setTimeout(r, 20));
  await monitor.tick();
  assert.equal(snapshot.codex.usage.total, 1630, 'Codex cumulative snapshot must replace, not sum');
  assert.equal(snapshot.codex.primary.remainingPercent, 58);
  assert.equal(snapshot.codex.quotaHistory.length, 1, 'quota history is bucketed by minute');
  assert.equal(snapshot.codex.quotaHistory[0].usedPercent, 42);

  fs.rmSync(root, { recursive: true, force: true });
  console.log('monitor.test: OK');
})().catch(err => { console.error(err); process.exit(1); });
