(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AiMonitorInsights = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ACTIVE_MS = 15_000;
  const RECENT_MS = 120_000;

  function number(value) {
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  function latestAgent(snapshot) {
    const agents = [
      ...((snapshot.codex && snapshot.codex.agents) || []).map(agent => ({ ...agent, provider: 'Codex' })),
      ...((snapshot.claude && snapshot.claude.agents) || []).map(agent => ({ ...agent, provider: 'Claude' })),
    ];
    return agents.sort((a, b) => number(b.lastEventAt) - number(a.lastEventAt))[0] || null;
  }

  function quotaLevel(remaining) {
    if (remaining == null) return 'unknown';
    if (remaining <= 15) return 'critical';
    if (remaining <= 30) return 'warning';
    return 'good';
  }

  function modelFamily(model) {
    const value = String(model || '').toLowerCase();
    if (value.includes('astra')) return 'Astra';
    if (value.includes('luna')) return 'Luna';
    if (value.includes('terra')) return 'Terra';
    if (value.includes('sol')) return 'Sol';
    return model || 'modello non rilevato';
  }

  function buildRecommendation(remaining, model, language = 'it', context = {}) {
    const en = language === 'en';
    const family = modelFamily(model);
    const activeCount = number(context.activeCount);
    const burn = number(context.burn);
    const sampled = number(context.sampleMinutes) >= 1;
    const minutesLeft = sampled && burn > 0.02 && remaining != null ? Math.max(1, Math.round(remaining / burn)) : null;
    const turns = number(context.turnCount);
    const compactions = number(context.compactionCount);
    if (remaining == null) {
      return { level: 'neutral', title: en ? 'Connect Codex logs' : 'Collega i log di Codex', text: en ? 'I cannot estimate quota or give a model recommendation until a Codex log folder is detected. Open Info → Log folders.' : 'Non posso stimare la quota né consigliare un modello finché non rilevo una cartella log di Codex. Apri Info → Cartelle log.' };
    }
    if (compactions >= 2 || turns >= 40) {
      return { level: 'warning', title: en ? 'Create a handoff, then start fresh' : 'Crea un HANDOFF, poi riparti', text: en ? `This conversation has ${turns} detected turns and ${compactions} context compactions. Ask for a HANDOFF.md with decisions, changed files, tests, and next steps; verify it, then open a new conversation. Do not clear the cache.` : `Questa conversazione ha ${turns} turni rilevati e ${compactions} compattazioni del contesto. Chiedi un HANDOFF.md con decisioni, file modificati, test e prossimi passi; verificalo, poi apri una nuova conversazione. Non pulire la cache.` };
    }
    if (compactions >= 1 || turns >= 25) {
      return { level: 'good', title: en ? 'Prepare a handoff soon' : 'Prepara presto un HANDOFF', text: en ? `This conversation has ${turns} detected turns and ${compactions} context compaction. You can continue, but save decisions, changed files, tests, and next steps before the thread gets harder to transfer.` : `Questa conversazione ha ${turns} turni rilevati e ${compactions} compattazione del contesto. Puoi continuare, ma salva decisioni, file modificati, test e prossimi passi prima che diventi più difficile trasferire il lavoro.` };
    }
    if (remaining <= 15) {
      if (family === 'Luna') return { level: 'critical', title: en ? 'Quota nearly exhausted' : 'Quota quasi esaurita', text: en ? 'You are already on Luna. Avoid new heavy tasks until the reset if you can.' : 'Sei già su Luna. Evita nuovi task pesanti fino al reset, se puoi.' };
      const agentsNote = activeCount > 1 ? (en ? ` ${activeCount} agents are active: stop any you no longer need first.` : ` Hai ${activeCount} agenti attivi: prima ferma quelli che non ti servono.`) : '';
      return { level: 'critical', title: en ? 'Protect the remaining quota' : 'Proteggi la quota rimasta', text: en ? `For the next bounded task, use Luna · Low if available. Keep Sol/Astra only for work that needs deep analysis.${agentsNote}` : `Per il prossimo task ben delimitato usa Luna · Low, se disponibile. Tieni Sol/Astra solo per analisi che ne hanno davvero bisogno.${agentsNote}` };
    }
    if (remaining <= 30) {
      if (family === 'Luna') return { level: 'warning', title: en ? 'Low quota, model already efficient' : 'Quota bassa, modello già efficiente', text: en ? 'Keep going; use more reasoning only when the result truly needs it.' : 'Continua così; usa più ragionamento solo quando il risultato lo richiede davvero.' };
      if (minutesLeft != null) return { level: 'warning', title: en ? 'Plan the next task' : 'Pianifica il prossimo task', text: en ? `At the current pace you have about ${minutesLeft} minutes. Finish this task; for the next small or well-scoped one, consider Luna · Low if available.` : `A questo ritmo hai circa ${minutesLeft} minuti. Chiudi questo task; per il prossimo, se è piccolo o ben definito, valuta Luna · Low se disponibile.` };
      return { level: 'warning', title: en ? 'Keep the next task focused' : 'Tieni focalizzato il prossimo task', text: en ? 'Quota is below 30%. Finish the current work; for the next small or well-scoped task, consider Luna · Low if available.' : 'La quota è sotto il 30%. Chiudi il lavoro attuale; per il prossimo task piccolo o ben definito, valuta Luna · Low se disponibile.' };
    }
    if (activeCount > 1) return { level: 'good', title: en ? 'Two agents are using the same allowance' : 'Più agenti, stessa quota', text: en ? `${activeCount} agents are active. This is fine while each has a clear job; stop idle ones before opening another.` : `Hai ${activeCount} agenti attivi. Va bene se ognuno ha un compito chiaro; ferma quelli fermi prima di aprirne un altro.` };
    return { level: 'good', title: en ? 'You have room to work' : 'Hai margine per lavorare', text: en ? `You have ${Math.round(remaining)}% of the 5-hour quota left${sampled && burn > 0.02 ? `, at −${burn.toFixed(1)} points/min` : ''}. There is no quota-based reason to switch model now.` : `Hai il ${Math.round(remaining)}% della quota di 5 ore${sampled && burn > 0.02 ? `, a −${burn.toFixed(1)} punti/min` : ''}. Ora non c’è una ragione legata alla quota per cambiare modello.` };
  }

  function buildInsights(snapshot, now = Date.now(), language = 'it') {
    const en = language === 'en';
    const codex = snapshot.codex || {};
    const claude = snapshot.claude || {};
    const system = snapshot.system || {};
    const agents = [...(codex.agents || []), ...(claude.agents || [])];
    const activeAgents = agents.filter(agent => agent.active);
    const latest = latestAgent(snapshot);
    const conversationAgent = [...(codex.agents || [])].sort((a, b) => {
      const compactionDelta = number(b.compactionCount) - number(a.compactionCount);
      return compactionDelta || (number(b.turnCount) - number(a.turnCount));
    })[0] || latest;
    const lastActivityAt = Math.max(number(codex.lastActivityAt), number(claude.lastActivityAt), number(latest && latest.lastEventAt)) || null;
    const ageMs = lastActivityAt ? Math.max(0, now - lastActivityAt) : null;
    const totalRate = number(codex.tokenRatePerMin) + number(claude.tokenRatePerMin);
    const working = activeAgents.length > 0 && totalRate > 0 && ageMs != null && ageMs <= ACTIVE_MS;
    const appOpen = !!(system.codexActive || system.claudeActive);
    const recent = ageMs != null && ageMs <= RECENT_MS;
    const mode = working ? 'working' : (appOpen || recent ? 'waiting' : 'idle');

    let statusTitle = en ? 'No AI activity detected' : 'Nessuna attività AI rilevata';
    let statusDetail = en ? 'Codex and Claude are not writing local data.' : 'Codex e Claude non stanno scrivendo dati locali.';
    if (mode === 'working') {
      statusTitle = en ? `${latest ? latest.provider : 'AI'} is working` : `${latest ? latest.provider : 'AI'} sta lavorando`;
      statusDetail = en ? `${activeAgents.length || 1} active task · ${modelFamily(latest && latest.model)}` : `${activeAgents.length || 1} task in attività · ${modelFamily(latest && latest.model)}`;
    } else if (mode === 'waiting') {
      statusTitle = en ? 'Open, but not generating now' : 'Aperto, ma ora non sta generando';
      statusDetail = recent ? (en ? `${agents.length || 1} recently seen task · ${modelFamily(latest && latest.model)}` : `${agents.length || 1} task visto di recente · ${modelFamily(latest && latest.model)}`) : (en ? 'The app is open, with no new detected tokens.' : 'L’app è aperta, senza nuovi token rilevati.');
    }

    const primary = codex.primary || null;
    const remaining = primary && Number.isFinite(Number(primary.remainingPercent)) ? Number(primary.remainingPercent) : null;
    const level = quotaLevel(remaining);
    const burn = number(codex.burnPercentPerMin);
    const sampleMinutes = number(codex.burnSampleMinutes);
    const delta = number(codex.burnDeltaPoints);
    let paceText = en ? 'No recent usage detected' : 'Nessun consumo recente rilevato';
    let forecastText = en ? 'Forecast paused until usage resumes' : 'Stima sospesa finché il consumo non riparte';
    if (burn > 0.02) paceText = en ? `−${burn.toFixed(burn < 10 ? 1 : 0)} quota points/min · last ${Math.max(1, Math.round(sampleMinutes))} min` : `−${burn.toFixed(burn < 10 ? 1 : 0)} punti quota/min · ultimi ${Math.max(1, Math.round(sampleMinutes))} min`;
    if (working && remaining != null && burn > 0.02 && sampleMinutes >= 1 && delta >= 0.5) {
      const minutesLeft = Math.max(1, Math.round(remaining / burn));
      forecastText = en ? `At this pace: about ${minutesLeft} min until quota runs out` : `Se il ritmo resta uguale: circa ${minutesLeft} min alla fine della quota`;
    }

    return {
      mode,
      statusTitle,
      statusDetail,
      lastActivityAt,
      ageMs,
      activeCount: activeAgents.length,
      recentCount: agents.length,
      latestModel: latest && latest.model,
      latestEffort: latest && latest.reasoningEffort,
      quota: {
        remaining,
        level,
        resetAt: primary && primary.resetsAt ? Number(primary.resetsAt) * 1000 : null,
        paceText,
        forecastText,
      },
      recommendation: buildRecommendation(remaining, latest && latest.model, language, { activeCount: activeAgents.length, burn, sampleMinutes, working, turnCount: conversationAgent && conversationAgent.turnCount, compactionCount: conversationAgent && conversationAgent.compactionCount }),
    };
  }

  return { buildInsights, buildRecommendation, modelFamily, quotaLevel };
});
