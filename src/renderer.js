const $ = id => document.getElementById(id);
let currentSettings = { opacity: 0.92, pinned: false, mode: 'easy', language: 'en' };
let latestSnapshot = null;
const strings = {
  it: {
    now: 'ORA', fiveHourQuota: 'QUOTA CODEX · 5 ORE', week: 'Settimana', quotaPace: 'RITMO QUOTA', advice: 'CONSIGLIO', recentTasks: 'CHAT RECENTI', technicalDetails: 'Dettagli tecnici', optional: 'facoltativi', detailsHelp: 'Valori cumulativi della sessione recente: non indicano il costo né quanto contesto resta.', privacy: 'Solo dati locali · nessun prompt letto', mindfulLabel: 'UNA PICCOLA PAUSA', operationalOverview: 'PANORAMICA OPERATIVA', agentsNow: 'AGENTI ORA', lastEvent: 'ULTIMO EVENTO', quotaForecast: 'QUOTE E PREVISIONE', fiveHourWindow: 'Finestra 5 ore', weeklyWindow: 'Finestra settimanale', sessionUsage: 'CONSUMO DELLA SESSIONE', agentsModels: 'AGENTI E MODELLI', howToRead: 'COME LEGGERE QUESTI DATI', advancedHelp: '“Attivo” significa che arrivano nuovi dati locali; “recente” significa che l’agente è stato visto negli ultimi 2 minuti. I controlli automatici interni non sono chat aggiuntive. I token sono cumulativi della sessione recente: non sono costo né contesto residuo.', quotaHistory: 'STORICO QUOTA · 5 ORE', collecting: 'raccolta dati', chartLocalOnly: 'Il grafico mostra solo i punti presenti nei log locali.', chartAvailable: '{minutes} min disponibili', working: 'AL LAVORO', waiting: 'IN ATTESA', idle: 'INATTIVO', lastActivity: 'Ultima attività', resetUnavailable: 'Reset non disponibile', resetAt: 'Reset alle', resetDateAt: 'Reset il {date} alle', noRecentUsage: 'Nessun consumo recente', noRecentTasks: 'Nessuna chat negli ultimi 2 minuti', noRecentAgents: 'Nessun agente negli ultimi 2 minuti', cumulative: 'cumul.', activeNow: 'attivo ora', seen: 'visto {time}', automaticCheck: 'controllo automatico', tokensCumulative: '{tokens} token cumul.', cacheUnavailable: 'Cache: nessun dato di input disponibile.', cacheShare: 'Cache: {share}% dell’input rilevato. È riuso tecnico, non una misura di qualità.', infoTitle: 'Come leggere Agents Monitor', close: 'Chiudi', infoContent: '<section><h2>Cosa osserva</h2><p>Legge solo metadati locali dei log di Codex e Claude Code: attività, modello, token e limiti quando vengono registrati. Non legge il testo dei prompt né invia dati fuori dal computer.</p></section><section><h2>Stati</h2><p>“Al lavoro” significa che arrivano nuovi token. “In attesa” significa che l’app o un task è stato visto di recente, ma ora non sta generando. “Inattivo” significa che non ci sono eventi recenti.</p></section><section><h2>Quote e stime</h2><p>Le barre mostrano soltanto le quote che Codex espone nei log locali. La previsione usa il ritmo degli ultimi minuti: è una stima, non una promessa.</p></section><section><h2>Token e cache</h2><p>I token sono cumulativi della sessione recente. Non indicano costo, contesto residuo o qualità. La cache segnala riuso tecnico dell’input.</p></section><section><h2>Cartelle</h2><p>Il progetto può stare ovunque. Agents Monitor cerca i log utente di Codex e Claude Code, non la cartella del progetto. Se hai cambiato la cartella dei log nelle impostazioni di Codex o usi un profilo diverso, potremo aggiungere il percorso personalizzato.</p></section>'
  },
  en: {
    now: 'NOW', fiveHourQuota: 'CODEX QUOTA · 5 HOURS', week: 'Week', quotaPace: 'QUOTA PACE', advice: 'SUGGESTION', recentTasks: 'RECENT CHATS', technicalDetails: 'Technical details', optional: 'optional', detailsHelp: 'Cumulative values from the recent session: they are neither cost nor remaining context.', privacy: 'Local data only · no prompts read', mindfulLabel: 'A SMALL PAUSE', operationalOverview: 'OPERATIONAL OVERVIEW', agentsNow: 'AGENTS NOW', lastEvent: 'LAST EVENT', quotaForecast: 'QUOTA AND FORECAST', fiveHourWindow: '5-hour window', weeklyWindow: 'Weekly window', sessionUsage: 'SESSION USAGE', agentsModels: 'AGENTS AND MODELS', howToRead: 'HOW TO READ THIS', advancedHelp: '“Active” means new local data is arriving; “recent” means the agent was seen in the last 2 minutes. Internal automatic checks are not additional chats. Tokens are cumulative for the recent session: they are not cost or remaining context.', quotaHistory: 'QUOTA HISTORY · 5 HOURS', collecting: 'collecting data', chartLocalOnly: 'The chart shows only points found in local logs.', chartAvailable: '{minutes} min available', working: 'WORKING', waiting: 'WAITING', idle: 'IDLE', lastActivity: 'Last activity', resetUnavailable: 'Reset unavailable', resetAt: 'Resets at', resetDateAt: 'Resets {date} at', noRecentUsage: 'No recent usage', noRecentTasks: 'No chats in the last 2 minutes', noRecentAgents: 'No agents in the last 2 minutes', cumulative: 'cumul.', activeNow: 'active now', seen: 'seen {time}', automaticCheck: 'automatic check', tokensCumulative: '{tokens} tokens cumul.', cacheUnavailable: 'Cache: no input data available.', cacheShare: 'Cache: {share}% of detected input. It is technical reuse, not a quality measure.', infoTitle: 'How to read Agents Monitor', close: 'Close', infoContent: '<section><h2>What it watches</h2><p>It reads only local metadata from Codex and Claude Code logs: activity, model, tokens, and limits when they are recorded. It does not read prompt text or send data away from your computer.</p></section><section><h2>States</h2><p>“Working” means new tokens are arriving. “Waiting” means the app or a task was seen recently but is not generating now. “Idle” means there have been no recent events.</p></section><section><h2>Quotas and forecasts</h2><p>Bars show only quotas that Codex exposes in local logs. The forecast uses the pace of the last few minutes: it is an estimate, not a promise.</p></section><section><h2>Tokens and cache</h2><p>Tokens are cumulative for the recent session. They do not mean cost, remaining context, or quality. Cache indicates technical input reuse.</p></section><section><h2>Folders</h2><p>Your project can live anywhere. Agents Monitor looks for per-user Codex and Claude Code logs, not your project folder. If you changed Codex’s log directory or use a different profile, we can add a custom path.</p></section>'
  },
};
strings.it.advice = 'COSA FARE ORA';
strings.en.advice = 'WHAT TO DO NOW';
strings.it.chartLocalOnly = 'La linea mostra la percentuale di quota rimasta. Vengono usati solo i punti presenti nei log locali.';
strings.en.chartLocalOnly = 'The line shows the percentage of quota remaining. Only points found in local logs are used.';

const sourceStrings = {
  it: { title: 'Cartelle log', button: 'Cartelle log', choose: 'Scegli cartella', intro: 'Scegli le cartelle dove Codex e Claude Code salvano i log. L’app leggerà solo file .jsonl locali.', found: '{files} file .jsonl trovati', missing: 'Cartella non trovata', close: 'Chiudi' },
  en: { title: 'Log folders', button: 'Log folders', choose: 'Choose folder', intro: 'Choose the folders where Codex and Claude Code save logs. The app will read local .jsonl files only.', found: '{files} .jsonl files found', missing: 'Folder not found', close: 'Close' },
};
const infoArticles = {
  it: `<section><h2>A cosa serve</h2><p>Agents Monitor risponde a tre domande: l’AI sta lavorando adesso? Quanta quota Codex rimane? C’è qualcosa di utile da fare?</p></section>
    <section><h2>Easy e Advanced</h2><p>Easy mostra la sintesi utile durante il lavoro. Advanced mantiene la stessa sintesi e aggiunge grafico della quota, consumo tecnico e dettagli su agenti e modelli.</p></section>
    <section><h2>Stato</h2><p><strong>Al lavoro</strong>: stanno arrivando nuovi token. <strong>In attesa</strong>: Codex o Claude è aperto o è stato visto di recente, ma non sta generando. <strong>Inattivo</strong>: non arrivano eventi recenti.</p></section>
    <section><h2>Quota e ritmo</h2><p>La percentuale indica la quota Codex ancora disponibile nella finestra di 5 ore. Il ritmo misura quanti punti percentuali sono stati consumati al minuto. La previsione compare solo quando esistono abbastanza dati recenti.</p></section>
    <section><h2>Cosa fare ora</h2><p>Il consiglio usa segnali misurabili: quota, ritmo, modello, agenti attivi, turni e compattazioni del contesto. Non legge il contenuto del task e non finge di conoscerne difficoltà o importanza.</p></section>
    <section><h2>Nuova conversazione e HANDOFF</h2><p>Dopo 25 turni o una compattazione suggerisce di preparare un HANDOFF. Dopo 40 turni o due compattazioni consiglia di verificare il file e ripartire in una nuova conversazione. Sono soglie prudenziali, non un limite tecnico esatto.</p></section>
    <section><h2>Token e cache</h2><p>I token sono contatori tecnici cumulativi dei log recenti. Non rappresentano costo, qualità o contesto ancora disponibile. La cache è input riutilizzato: non è una memoria da pulire e cancellarla non migliora la conversazione.</p></section>
    <section><h2>Privacy e cartelle log</h2><p>I dati restano sul computer e il testo dei prompt non viene letto. Il progetto può stare ovunque: Agents Monitor ha bisogno delle cartelle dei log. Usa “Cartelle log” qui sotto per verificarle o cambiarle.</p></section>`,
  en: `<section><h2>What it is for</h2><p>Agents Monitor answers three questions: is AI working now? How much Codex quota is left? Is there a useful action to take?</p></section>
    <section><h2>Easy and Advanced</h2><p>Easy shows the useful summary while you work. Advanced keeps the same summary and adds quota history, technical usage, and agent and model details.</p></section>
    <section><h2>Status</h2><p><strong>Working</strong>: new tokens are arriving. <strong>Waiting</strong>: Codex or Claude is open or was seen recently, but is not generating. <strong>Idle</strong>: there are no recent events.</p></section>
    <section><h2>Quota and pace</h2><p>The percentage is the Codex quota still available in the 5-hour window. Pace measures percentage points used per minute. A forecast appears only when enough recent data exists.</p></section>
    <section><h2>What to do now</h2><p>The suggestion uses measurable signals: quota, pace, model, active agents, turns, and context compactions. It does not read the task content or pretend to know its difficulty or importance.</p></section>
    <section><h2>New conversation and HANDOFF</h2><p>After 25 turns or one compaction, it suggests preparing a HANDOFF. After 40 turns or two compactions, it recommends verifying the file and starting a new conversation. These are cautious heuristics, not exact technical limits.</p></section>
    <section><h2>Tokens and cache</h2><p>Tokens are cumulative technical counters from recent logs. They are not cost, quality, or remaining context. Cache is reused input: it is not memory to clear, and deleting it does not improve a conversation.</p></section>
    <section><h2>Privacy and log folders</h2><p>Data stays on this computer and prompt text is not read. Your project can live anywhere: Agents Monitor needs the log folders. Use “Log folders” below to verify or change them.</p></section>`,
};
function language() { return currentSettings.language === 'en' ? 'en' : 'it'; }
function t(key, replacements = {}) { return Object.entries(replacements).reduce((text, [name, value]) => text.replace(`{${name}}`, value), strings[language()][key] || key); }
function updateStaticLanguage() {
  document.documentElement.lang = language();
  document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
  $('italianBtn').classList.toggle('active', language() === 'it');
  $('englishBtn').classList.toggle('active', language() === 'en');
  $('infoBtn').setAttribute('aria-label', language() === 'it' ? 'Informazioni' : 'Information');
  $('closeInfoBtn').setAttribute('aria-label', t('close'));
  $('infoTitle').textContent = t('infoTitle');
  $('infoContent').innerHTML = infoArticles[language()];
  const sources = sourceStrings[language()];
  $('sourcesBtn').textContent = sources.button;
  $('sourcesTitle').textContent = sources.title;
  $('sourcesIntro').textContent = sources.intro;
  $('chooseCodexSource').textContent = sources.choose;
  $('chooseClaudeSource').textContent = sources.choose;
  $('closeSourcesBtn').setAttribute('aria-label', sources.close);
}
const mindfulPrompts = [
  'Ricordati di guardare fuori dalla finestra.',
  'Una passeggiata di cinque minuti è ancora una buona idea.',
  'Prima del prossimo prompt, fai un respiro.',
  'Non devi risolvere tutto adesso.',
  'L’AI è uno strumento: il tuo giudizio resta la parte importante.',
  'Se stai girando in tondo, fai una pausa e torna con occhi nuovi.',
  'Un prompt più chiaro spesso vale più di dieci prompt di fretta.',
  'Lascia spazio alla noia, alle persone e alle idee non ottimizzate.',
  'Sii curioso, non compulsivo.',
  'Tratta bene chiunque ti aiuti, anche quando è una macchina.',
  'L’output è una proposta, non un verdetto.',
  'Alzati un attimo: il corpo non è una periferica.',
  'Se puoi spiegarlo a una persona, probabilmente lo hai capito davvero.',
  'Non delegare il gusto: è una delle cose più tue.',
  'Anche una risposta veloce merita una seconda occhiata.',
  'Chiudi una cosa piccola prima di aprirne cinque grandi.',
  'L’AI può accelerare il lavoro; non deve accelerare la tua vita.',
  'Bevi un bicchiere d’acqua. Sì, quello vero.',
  'Se una scelta conta, prenditi il tempo di pensarla senza chatbot.',
  'Un errore corretto con calma insegna più di dieci tentativi furiosi.',
  'Non serve ottimizzare ogni minuto per usarlo bene.',
  'La versione imperfetta ma finita ha sempre qualcosa da dirti.',
  'Ogni tanto chiedi: questa cosa mi serve davvero?',
  'Il silenzio non è tempo perso.',
  'Una buona domanda è già metà del lavoro.',
  'Puoi usare l’AI senza trasformare tutto in una richiesta.',
  'Le idee migliori qualche volta arrivano lontano dalla tastiera.',
  'Fai spazio alle persone che non rispondono in 0,3 secondi.',
  'Se sei stanco, non è un bug da nascondere.',
  'Il prossimo prompt può aspettare trenta secondi.',
  'Controlla i fatti importanti: anche le risposte fluenti sbagliano.',
  'Una pausa non annulla il ritmo: lo rende sostenibile.',
  'Non confondere “possibile” con “necessario”.',
  'Tieni una parte del lavoro che sai fare solo tu.',
  'Le scorciatoie sono utili quando sai dove vuoi arrivare.',
  'Chiedi aiuto, ma conserva il diritto di cambiare idea.',
  'Il tuo tempo libero non deve produrre niente.',
  'Se hai un dubbio, scrivilo prima di chiedere una risposta.',
  'L’AI non può scegliere al posto tuo ciò che conta.',
  'Manda quel messaggio a un amico, non solo a un modello.',
  'Torna al problema, non all’ennesima variazione del prompt.',
  'Hai il permesso di fermarti quando basta.',
  'La curiosità è sana; il refresh compulsivo un po’ meno.',
  'Una sedia comoda non sostituisce lo stretching.',
  'Prima di automatizzare, prova a capire il gesto.',
  'Non tutti i pensieri devono diventare contenuto.',
  'Se l’AI ti dà ragione troppo facilmente, prova a contraddirla.',
  'Una risposta utile può essere anche: “non lo so ancora”.',
  'Non trasformare un confronto in una gara contro una macchina.',
  'Lascia una traccia tua nelle cose che condividi.',
  'Il contesto conta più della risposta perfetta.',
  'Fermarti per scegliere meglio è comunque avanzare.',
  'Non sei una pipeline.',
  'Il criterio è tuo: allenalo.',
  'Ogni tanto guarda le nuvole, non solo le barre di utilizzo.',
  'La creatività ha bisogno anche di tempo non misurato.',
  'Se ti innervosisci, allontanati dallo schermo per due minuti.',
  'Non c’è premio per aver chiesto più prompt del necessario.',
  'Una buona giornata non si misura in token.',
  'Fai una cosa lentamente, solo perché puoi.',
  'Prima di inviare, chiediti: è davvero la mia voce?',
  'La tecnologia migliore è quella che ti restituisce tempo umano.',
  'Usa l’AI per esplorare, non per smettere di pensare.',
  'Se puoi, esci alla luce naturale per un minuto.',
  'L’AI è disponibile sempre; tu non devi esserlo.',
  'Non dimenticare: hai una vita anche fuori da questa finestra.',
];
const mindfulPromptsEn = [
  'Remember to look out of the window.',
  'A five-minute walk is still a good idea.',
  'Take one breath before your next prompt.',
  'You do not have to solve everything right now.',
  'AI is a tool; your judgement is still the important part.',
  'If you are going in circles, pause and return with fresh eyes.',
  'A clearer prompt often beats ten rushed prompts.',
  'Make room for boredom, people, and unoptimized ideas.',
  'Be curious, not compulsive.',
  'A good day is not measured in tokens.',
  'The output is a proposal, not a verdict.',
  'Your body is not a peripheral device.',
  'Do not outsource your taste: it is one of the things that is yours.',
  'An answer that sounds fluent can still be wrong.',
  'Technology is best when it gives you back human time.',
];
let mindfulIndex = Math.floor(Math.random() * mindfulPrompts.length);

function rotateMindfulPrompt() {
  const prompts = language() === 'en' ? mindfulPromptsEn : mindfulPrompts;
  $('mindfulPrompt').textContent = prompts[mindfulIndex % prompts.length];
  mindfulIndex = (mindfulIndex + 1) % prompts.length;
}

function createWebBridge() {
  document.documentElement.classList.add('web-runtime');
  const snapshotListeners = [];
  const settingsListeners = [];
  const events = new EventSource('/api/events');
  events.onmessage = event => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'snapshot') snapshotListeners.forEach(fn => fn(message.value));
      if (message.type === 'settings') settingsListeners.forEach(fn => fn(message.value));
    } catch (_) {}
  };

  return {
    getSettings: () => fetch('/api/settings').then(response => response.json()),
    onSnapshot: fn => snapshotListeners.push(fn),
    onSettings: fn => settingsListeners.push(fn),
    setLanguage: async language => {
      const response = await fetch('/api/settings', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ language }),
      });
      const result = await response.json();
      settingsListeners.forEach(fn => fn(result));
      return result;
    },
    setViewMode: async mode => {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const result = await response.json();
      settingsListeners.forEach(fn => fn(result));
      return result;
    },
    setPinned: async value => {
      const response = await fetch('/api/pin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled: !!value }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'pin unavailable');
      settingsListeners.forEach(fn => fn(result));
      return result;
    },
    getSources: () => fetch('/api/sources').then(response => response.json()),
    chooseSource: async provider => {
      const response = await fetch('/api/pick-folder', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ provider }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'folder picker unavailable');
      return result.path;
    },
    setSource: async (provider, path) => {
      const response = await fetch('/api/sources', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ provider, path }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'folder unavailable');
      return result;
    },
  };
}

const bridge = window.aiMonitor || createWebBridge();

function fmt(n) {
  n = Number(n) || 0;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}k`;
  return Math.round(n).toString();
}

function ago(ms) {
  const en = language() === 'en';
  if (ms == null) return en ? 'not detected' : 'mai rilevata';
  if (ms < 10_000) return en ? 'now' : 'adesso';
  if (ms < 60_000) return en ? `${Math.round(ms / 1000)} sec ago` : `${Math.round(ms / 1000)} sec fa`;
  if (ms < 3_600_000) return en ? `${Math.round(ms / 60_000)} min ago` : `${Math.round(ms / 60_000)} min fa`;
  return en ? `${Math.round(ms / 3_600_000)} h ago` : `${Math.round(ms / 3_600_000)} h fa`;
}

function resetLabel(timestamp) {
  if (!timestamp) return t('resetUnavailable');
  const date = new Date(timestamp);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const locale = language() === 'en' ? 'en-GB' : 'it-IT';
  const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `${t('resetAt')} ${time}`;
  return `${t('resetDateAt', { date: date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }) })} ${time}`;
}

function setLevel(el, level) {
  el.classList.remove('is-good', 'is-warning', 'is-critical', 'is-working', 'is-waiting', 'is-idle');
  if (level) el.classList.add(`is-${level}`);
}

function setBar(el, remaining, level) {
  el.style.width = remaining == null ? '0%' : `${Math.max(0, Math.min(100, remaining))}%`;
  setLevel(el, level);
}

function applySettings(settings) {
  currentSettings = { ...currentSettings, ...settings };
  document.documentElement.style.setProperty('--bg', `rgba(12, 13, 16, ${currentSettings.opacity || 0.92})`);
  const pin = $('pinBtn');
  pin.classList.toggle('active', !!currentSettings.pinned);
  pin.setAttribute('aria-pressed', String(!!currentSettings.pinned));
  pin.title = currentSettings.pinned ? (language() === 'en' ? 'Disable always on top' : 'Disattiva primo piano') : (language() === 'en' ? 'Keep on top' : 'Mantieni in primo piano');
  const advanced = (currentSettings.viewMode || currentSettings.mode) === 'advanced';
  $('easyContent').hidden = false;
  $('easyContent').classList.toggle('with-advanced', advanced);
  $('advancedContent').hidden = !advanced;
  $('easyModeBtn').classList.toggle('active', !advanced);
  $('advancedModeBtn').classList.toggle('active', advanced);
  $('easyModeBtn').setAttribute('aria-pressed', String(!advanced));
  $('advancedModeBtn').setAttribute('aria-pressed', String(advanced));
  updateStaticLanguage();
  rotateMindfulPrompt();
  if (latestSnapshot) render(latestSnapshot);
}

function providerState(provider, systemActive) {
  const agents = provider.agents || [];
  if (Number(provider.tokenRatePerMin) > 0 && agents.some(agent => agent.active)) return [language() === 'en' ? 'working' : 'sta lavorando', 'working'];
  if (systemActive || agents.length) return [language() === 'en' ? 'waiting' : 'in attesa', 'waiting'];
  return [language() === 'en' ? 'idle' : 'inattivo', 'idle'];
}

function combinedUsage(snapshot) {
  const codex = snapshot.codex.usage || {};
  const claude = snapshot.claude.usage || {};
  return {
    input: (codex.input || 0) + (claude.input || 0),
    cached: (codex.cached || 0) + (claude.cached || 0),
    output: (codex.output || 0) + (claude.output || 0),
    reasoning: (codex.reasoning || 0) + (claude.reasoning || 0),
    total: (codex.total || 0) + (claude.total || 0),
  };
}

function renderQuotaChart(samples, now) {
  const windowMs = 5 * 60 * 60 * 1000;
  const start = now - windowMs;
  const points = (samples || [])
    .filter(sample => Number.isFinite(Number(sample.t)) && Number.isFinite(Number(sample.usedPercent)) && sample.t >= start && sample.t <= now)
    .map(sample => {
      const x = 30 + Math.max(0, Math.min(1, (sample.t - start) / windowMs)) * 280;
      const remaining = Math.max(0, Math.min(100, 100 - Number(sample.usedPercent)));
      const y = 108 - (remaining / 100) * 92;
      return { x, y, t: sample.t };
    });
  const line = $('quotaChartLine');
  const area = $('quotaChartArea');
  const last = $('quotaChartLast');
  line.setAttribute('points', points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' '));
  if (points.length) {
    const first = points[0];
    const latest = points[points.length - 1];
    area.setAttribute('d', `M ${first.x.toFixed(1)} 108 L ${points.map(point => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' L ')} L ${latest.x.toFixed(1)} 108 Z`);
    last.setAttribute('cx', latest.x.toFixed(1));
    last.setAttribute('cy', latest.y.toFixed(1));
    const availableMinutes = Math.max(1, Math.round((latest.t - first.t) / 60_000));
    $('quotaChartRange').textContent = points.length > 1 ? t('chartAvailable', { minutes: availableMinutes }) : t('collecting');
  } else {
    area.setAttribute('d', '');
    last.setAttribute('cx', '-10');
    last.setAttribute('cy', '-10');
    $('quotaChartRange').textContent = t('collecting');
  }
  $('quotaChartStart').textContent = '−5h';
  $('quotaChartEnd').textContent = language() === 'en' ? 'now' : 'ora';
  $('quotaChartNote').textContent = t('chartLocalOnly');
}

function renderAdvanced(snapshot, insights, agents) {
  const modeLabels = { working: t('working'), waiting: t('waiting'), idle: t('idle') };
  $('advancedStatus').textContent = modeLabels[insights.mode];
  setLevel($('advancedStatus'), insights.mode);
  setLevel($('advancedContent').firstElementChild, insights.mode);
  $('advancedHeadline').textContent = insights.statusTitle;
  $('advancedSubline').textContent = insights.statusDetail;
  $('advancedRate').textContent = fmt((snapshot.codex.tokenRatePerMin || 0) + (snapshot.claude.tokenRatePerMin || 0));
  $('advancedActiveAgents').textContent = insights.activeCount;
  $('advancedLastActivity').textContent = ago(insights.ageMs);

  const primary = snapshot.codex.primary;
  const secondary = snapshot.codex.secondary;
  const primaryRemaining = insights.quota.remaining;
  const secondaryRemaining = secondary && Number.isFinite(Number(secondary.remainingPercent)) ? Number(secondary.remainingPercent) : null;
  const quotaLabels = language() === 'en' ? { good: 'OK', warning: 'LOW', critical: 'CRITICAL', unknown: 'N/A' } : { good: 'OK', warning: 'BASSA', critical: 'CRITICA', unknown: 'N/D' };
  $('advancedQuotaState').textContent = quotaLabels[insights.quota.level];
  $('advancedPrimaryQuota').textContent = primaryRemaining == null ? (language() === 'en' ? 'n/a' : 'n/d') : (language() === 'en' ? `${primaryRemaining.toFixed(0)}% remaining` : `${primaryRemaining.toFixed(0)}% rimasto`);
  $('advancedPrimaryReset').textContent = resetLabel(insights.quota.resetAt);
  setBar($('advancedPrimaryBar'), primaryRemaining, insights.quota.level);
  $('advancedWeeklyQuota').textContent = secondaryRemaining == null ? (language() === 'en' ? 'n/a' : 'n/d') : (language() === 'en' ? `${secondaryRemaining.toFixed(0)}% remaining` : `${secondaryRemaining.toFixed(0)}% rimasto`);
  $('advancedWeeklyReset').textContent = resetLabel(secondary && secondary.resetsAt ? Number(secondary.resetsAt) * 1000 : null);
  setBar($('advancedWeeklyBar'), secondaryRemaining, secondaryRemaining == null ? 'unknown' : (secondaryRemaining <= 15 ? 'critical' : secondaryRemaining <= 30 ? 'warning' : 'good'));
  $('advancedForecast').textContent = `${insights.quota.paceText}. ${insights.quota.forecastText}`;
  renderQuotaChart(snapshot.codex.quotaHistory, snapshot.at || Date.now());

  const usage = combinedUsage(snapshot);
  $('advancedTotalTokens').textContent = t('tokensCumulative', { tokens: fmt(usage.total) });
  $('advancedInput').textContent = fmt(usage.input);
  $('advancedCache').textContent = fmt(usage.cached);
  $('advancedOutput').textContent = fmt(usage.output);
  $('advancedReasoning').textContent = fmt(usage.reasoning);
  const cacheShare = usage.input + usage.cached > 0 ? Math.round((usage.cached / (usage.input + usage.cached)) * 100) : null;
  $('advancedCacheNote').textContent = cacheShare == null
    ? t('cacheUnavailable')
    : t('cacheShare', { share: cacheShare });

  $('advancedAgentCount').textContent = agents.length;
  const list = $('advancedAgentsList');
  list.innerHTML = '';
  if (!agents.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = t('noRecentAgents');
    list.appendChild(empty);
  } else {
    for (const agent of agents.slice(0, 10)) {
      const row = document.createElement('div');
      row.className = `advanced-agent ${agent.provider === 'Claude' ? 'provider-claude' : ''} ${agent.active ? 'is-working' : 'is-waiting'}`;
      const dot = document.createElement('div'); dot.className = 'dot';
      const main = document.createElement('div');
      const name = document.createElement('div'); name.className = 'advanced-agent-name'; name.textContent = `${agent.provider} · ${agent.name}`;
      const effort = agent.reasoningEffort ? ` · ${agent.reasoningEffort}` : '';
      const meta = document.createElement('div'); meta.className = 'advanced-agent-meta'; meta.textContent = `${agent.model || (language() === 'en' ? 'model n/a' : 'modello n/d')}${effort} · ${agent.active ? t('activeNow') : t('seen', { time: ago(Date.now() - (agent.lastEventAt || Date.now())) })}`;
      main.append(name, meta);
      const tokens = document.createElement('div'); tokens.className = 'advanced-agent-usage'; tokens.textContent = `${fmt(agent.usage.total)} ${t('cumulative')}`;
      row.append(dot, main, tokens);
      list.appendChild(row);
    }
  }
}

function render(snapshot) {
  latestSnapshot = snapshot;
  const insights = window.AiMonitorInsights.buildInsights(snapshot, Date.now(), language());
  const modeLabels = { working: t('working'), waiting: t('waiting'), idle: t('idle') };
  $('liveText').textContent = modeLabels[insights.mode];
  setLevel($('liveText').previousElementSibling, insights.mode);
  $('nowBadge').textContent = modeLabels[insights.mode];
  setLevel($('nowBadge'), insights.mode);
  setLevel($('nowCard'), insights.mode);
  $('nowTitle').textContent = insights.statusTitle;
  $('nowDetail').textContent = insights.statusDetail;
  $('lastActivity').textContent = `${t('lastActivity')}: ${ago(insights.ageMs)}`;

  const p = snapshot.codex.primary;
  const s = snapshot.codex.secondary;
  const pRem = insights.quota.remaining;
  const sRem = s && Number.isFinite(Number(s.remainingPercent)) ? Number(s.remainingPercent) : null;
  const quotaLabels = language() === 'en' ? { good: 'OK', warning: 'LOW', critical: 'CRITICAL', unknown: 'N/A' } : { good: 'OK', warning: 'BASSA', critical: 'CRITICA', unknown: 'N/D' };
  $('quotaBadge').textContent = quotaLabels[insights.quota.level];
  setLevel($('quotaBadge'), insights.quota.level);
  $('codex5hText').textContent = pRem == null ? (language() === 'en' ? 'n/a' : 'n/d') : (language() === 'en' ? `${pRem.toFixed(0)}% remaining` : `${pRem.toFixed(0)}% rimasto`);
  $('quotaReset').textContent = resetLabel(insights.quota.resetAt);
  setBar($('codex5hBar'), pRem, insights.quota.level);
  $('codexWeekText').textContent = sRem == null ? (language() === 'en' ? 'n/a' : 'n/d') : (language() === 'en' ? `${sRem.toFixed(0)}% remaining` : `${sRem.toFixed(0)}% rimasto`);
  $('quotaPace').textContent = insights.quota.paceText;
  $('quotaForecast').textContent = insights.quota.forecastText;

  const advice = insights.recommendation;
  setLevel($('adviceCard'), advice.level);
  $('adviceTitle').textContent = advice.title;
  $('adviceText').textContent = advice.text;

  const [codexText, codexLevel] = providerState(snapshot.codex, snapshot.system.codexActive);
  const [claudeText, claudeLevel] = providerState(snapshot.claude, snapshot.system.claudeActive);
  $('codexState').textContent = codexText;
  $('claudeState').textContent = claudeText;
  $('claudeDot').classList.add('provider-claude');
  setLevel($('codexDot'), codexLevel);
  setLevel($('claudeDot'), claudeLevel);

  const agents = [
    ...snapshot.codex.agents.map(agent => ({ ...agent, provider: 'Codex' })),
    ...snapshot.claude.agents.map(agent => ({ ...agent, provider: 'Claude' })),
  ].sort((a, b) => (b.lastEventAt || 0) - (a.lastEventAt || 0));
  $('totalAgents').textContent = agents.length;
  const list = $('agentsList');
  list.innerHTML = '';
  if (!agents.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = t('noRecentTasks');
    list.appendChild(empty);
  } else {
    for (const agent of agents.slice(0, 5)) {
      const row = document.createElement('div');
      row.className = `agent ${agent.provider === 'Claude' ? 'provider-claude' : ''} ${agent.active ? 'is-working' : 'is-waiting'}`;
      const dot = document.createElement('div'); dot.className = 'dot';
      const main = document.createElement('div'); main.className = 'agent-main';
      const name = document.createElement('div'); name.className = 'agent-name'; name.textContent = `${agent.provider} · ${agent.name}`;
      const effort = agent.reasoningEffort ? ` · ${agent.reasoningEffort}` : '';
      const model = document.createElement('div'); model.className = 'agent-model'; model.textContent = `${agent.model || (language() === 'en' ? 'model n/a' : 'modello n/d')}${effort} · ${ago(Date.now() - (agent.lastEventAt || Date.now()))}`;
      main.append(name, model);
      const usage = document.createElement('div'); usage.className = 'agent-usage'; usage.textContent = `${fmt(agent.usage.total)} ${t('cumulative')}`;
      row.append(dot, main, usage);
      list.appendChild(row);
    }
  }

  const usage = combinedUsage(snapshot);
  $('detailInput').textContent = fmt(usage.input);
  $('detailCache').textContent = fmt(usage.cached);
  $('detailOutput').textContent = fmt(usage.output);
  $('detailReasoning').textContent = fmt(usage.reasoning);
  $('lastUpdate').textContent = new Date(snapshot.at).toLocaleTimeString('it-IT');
  renderAdvanced(snapshot, insights, agents);
}

$('pinBtn').addEventListener('click', async () => {
  if (!bridge.setPinned) return;
  const pin = $('pinBtn');
  pin.disabled = true;
  try { await bridge.setPinned(!currentSettings.pinned); }
  catch (_) { pin.title = 'Primo piano non disponibile'; }
  finally { pin.disabled = false; }
});

$('easyModeBtn').addEventListener('click', () => bridge.setViewMode('easy'));
$('advancedModeBtn').addEventListener('click', () => bridge.setViewMode('advanced'));
$('italianBtn').addEventListener('click', () => bridge.setLanguage('it'));
$('englishBtn').addEventListener('click', () => bridge.setLanguage('en'));
$('infoBtn').addEventListener('click', () => $('infoDialog').showModal());
$('closeInfoBtn').addEventListener('click', () => $('infoDialog').close());
$('sourcesBtn').addEventListener('click', async () => {
  $('infoDialog').close();
  $('sourcesDialog').showModal();
  await renderSources();
});
$('closeSourcesBtn').addEventListener('click', () => $('sourcesDialog').close());

async function renderSources() {
  try {
    const sources = await bridge.getSources();
    for (const provider of ['codex', 'claude']) {
      const source = sources[provider] || {};
      const text = source.exists ? `${source.path} · ${sourceStrings[language()].found.replace('{files}', source.files || 0)}` : `${source.path || '—'} · ${sourceStrings[language()].missing}`;
      $(`${provider}SourceStatus`).textContent = text;
    }
  } catch (_) {}
}
async function chooseSource(provider) {
  const button = $(`choose${provider[0].toUpperCase()}${provider.slice(1)}Source`);
  button.disabled = true;
  try {
    const selected = await bridge.chooseSource(provider);
    if (selected) await bridge.setSource(provider, selected);
    await renderSources();
  } finally { button.disabled = false; }
}
$('chooseCodexSource').addEventListener('click', () => chooseSource('codex'));
$('chooseClaudeSource').addEventListener('click', () => chooseSource('claude'));

bridge.onSnapshot(render);
bridge.onSettings(applySettings);
bridge.getSettings().then(applySettings);
if (bridge.getSources) {
  bridge.getSources().then(sources => {
    if (sources.codex && !sources.codex.exists) {
      $('sourcesDialog').showModal();
      renderSources();
    }
  }).catch(() => {});
}
rotateMindfulPrompt();
setInterval(rotateMindfulPrompt, 10_000);

if (!window.aiMonitor && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch(() => {});
}
