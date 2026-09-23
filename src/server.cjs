const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');
const { LocalUsageMonitor } = require('./monitor.cjs');

const HOST = '127.0.0.1';
const PORT = Number(process.env.AI_MONITOR_PORT) || 4173;
const ROOT = __dirname;
const OPEN_APP = process.argv.includes('--open');
const clients = new Set();
let latestSnapshot = null;
let monitor = null;
let settings = { compact: false, opacity: 0.92, pinned: false, mode: 'easy', language: 'en', roots: {} };
const settingsPath = path.join(process.env.LOCALAPPDATA || process.env.APPDATA || ROOT, 'Agents Monitor', 'settings.json');

function loadSettings() {
  try {
    const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    settings = { ...settings, ...saved };
    if (settings.mode !== 'advanced') settings.mode = 'easy';
  } catch (_) {}
}

function saveSettings() {
  try {
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (_) {}
}

function sourceState() {
  const roots = (monitor && monitor.roots) || settings.roots || {};
  const live = (latestSnapshot && latestSnapshot.sources) || {};
  return ['codex', 'claude'].reduce((out, provider) => {
    const selected = roots[provider] || '';
    out[provider] = { path: selected, exists: fs.existsSync(selected), files: Number(live[provider] && live[provider].files) || 0 };
    return out;
  }, {});
}

function chooseFolder(initialPath) {
  const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const escaped = String(initialPath || '').replace(/'/g, "''");
  const command = "Add-Type -AssemblyName System.Windows.Forms; $d=New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description='Select the log folder'; $d.SelectedPath='" + escaped + "'; if($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK){[Console]::Out.Write($d.SelectedPath)}";
  return new Promise((resolve, reject) => execFile(powershell, ['-NoProfile', '-NonInteractive', '-STA', '-Command', command], { windowsHide: true, timeout: 120000 }, (error, stdout = '', stderr = '') => {
    if (error) return reject(new Error(stderr || error.message));
    resolve(stdout.trim());
  }));
}

loadSettings();

const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/insights.js', ['insights.js', 'text/javascript; charset=utf-8']],
  ['/renderer.js', ['renderer.js', 'text/javascript; charset=utf-8']],
  ['/manifest.webmanifest', ['manifest.webmanifest', 'application/manifest+json']],
  ['/service-worker.js', ['service-worker.js', 'text/javascript; charset=utf-8']],
  ['/icon.png', [path.join('..', 'assets', 'icon.png'), 'image/png']],
]);

function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
}

function broadcast(type, value) {
  const data = `data: ${JSON.stringify({ type, value })}\n\n`;
  for (const client of clients) client.write(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 16_384) reject(new Error('request too large'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function setAlwaysOnTop(enabled) {
  const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const script = path.join(__dirname, 'pin-window.ps1');

  return new Promise((resolve, reject) => {
    execFile(powershell, ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-File', script, enabled ? 'on' : 'off'], {
      windowsHide: true,
      timeout: 4_000,
    }, (error, _stdout, stderr) => error ? reject(new Error(stderr || error.message)) : resolve());
  });
}

function dockToRight() {
  const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const script = path.join(__dirname, 'dock-window.ps1');
  return new Promise(resolve => {
    execFile(powershell, ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-File', script], {
      windowsHide: true,
      timeout: 5_000,
    }, () => resolve());
  });
}

function browserPath() {
  const candidates = [
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env.PROGRAMFILES || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ];
  return candidates.find(candidate => candidate && fs.existsSync(candidate));
}

function openAppWindow() {
  const browser = browserPath();
  if (!browser) return;
  const profileRoot = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
  const profile = path.join(profileRoot, 'Agents Monitor', 'ChromeProfile');
  const child = spawn(browser, [
    `--app=http://${HOST}:${PORT}`,
    `--user-data-dir=${profile}`,
    '--window-size=470,900',
    '--no-first-run',
    '--disable-default-apps',
    '--disable-session-crashed-bubble',
  ], { detached: true, stdio: 'ignore', windowsHide: false });
  child.unref();
  setTimeout(async () => {
    await dockToRight();
    if (settings.pinned) await setAlwaysOnTop(true).catch(() => {});
  }, 150);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/api/settings') return json(res, 200, settings);
  if (req.method === 'GET' && url.pathname === '/api/sources') return json(res, 200, sourceState());

  if (req.method === 'POST' && url.pathname === '/api/settings') {
    try {
      const patch = JSON.parse(await readBody(req));
      if (typeof patch.compact === 'boolean') settings.compact = patch.compact;
      if (patch.mode === 'easy' || patch.mode === 'advanced') settings.mode = patch.mode;
      if (patch.language === 'it' || patch.language === 'en') settings.language = patch.language;
      if (Number.isFinite(Number(patch.opacity))) settings.opacity = Math.max(0.55, Math.min(1, Number(patch.opacity)));
      saveSettings();
      broadcast('settings', settings);
      return json(res, 200, settings);
    } catch (_) {
      return json(res, 400, { error: 'invalid request' });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/pin') {
    try {
      const body = JSON.parse(await readBody(req));
      const enabled = !!body.enabled;
      await setAlwaysOnTop(enabled);
      settings.pinned = enabled;
      saveSettings();
      broadcast('settings', settings);
      return json(res, 200, settings);
    } catch (_) {
      return json(res, 503, { error: 'Impossibile modificare il primo piano' });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/sources') {
    try {
      const body = JSON.parse(await readBody(req));
      if (!['codex', 'claude'].includes(body.provider) || typeof body.path !== 'string') return json(res, 400, { error: 'invalid source' });
      const selected = path.resolve(body.path.trim());
      if (!fs.existsSync(selected) || !fs.statSync(selected).isDirectory()) return json(res, 400, { error: 'folder not found' });
      settings.roots = { ...(settings.roots || {}), [body.provider]: selected };
      if (monitor) monitor.setRoots(settings.roots);
      saveSettings();
      broadcast('settings', settings);
      return json(res, 200, sourceState());
    } catch (_) { return json(res, 400, { error: 'invalid source' }); }
  }

  if (req.method === 'POST' && url.pathname === '/api/pick-folder') {
    try {
      const body = JSON.parse(await readBody(req));
      if (!['codex', 'claude'].includes(body.provider)) return json(res, 400, { error: 'invalid source' });
      const selected = await chooseFolder((sourceState()[body.provider] || {}).path);
      return json(res, 200, { path: selected || null });
    } catch (_) { return json(res, 500, { error: 'folder picker unavailable' }); }
  }

  if (req.method === 'GET' && url.pathname === '/api/events') {
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    });
    res.write(': connected\n\n');
    clients.add(res);
    if (latestSnapshot) res.write(`data: ${JSON.stringify({ type: 'snapshot', value: latestSnapshot })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'settings', value: settings })}\n\n`);
    req.on('close', () => clients.delete(res));
    return;
  }

  const file = files.get(url.pathname);
  if (req.method !== 'GET' || !file) {
    res.writeHead(404);
    return res.end('Not found');
  }

  const [relative, contentType] = file;
  const absolute = path.resolve(ROOT, relative);
  try {
    const body = fs.readFileSync(absolute);
    res.writeHead(200, {
      'content-type': contentType,
      'content-length': body.length,
      'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff',
    });
    res.end(body);
  } catch (_) {
    res.writeHead(500);
    res.end('Unable to load asset');
  }
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE' && OPEN_APP) {
    openAppWindow();
    process.exit(0);
  }
  console.error(error.message);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  monitor = new LocalUsageMonitor({ pollMs: 1000, roots: settings.roots });
  monitor.onSnapshot = snapshot => {
    latestSnapshot = snapshot;
    broadcast('snapshot', snapshot);
  };
  monitor.start();
  if (OPEN_APP) openAppWindow();
  console.log(`Agents Monitor web: http://${HOST}:${PORT}`);
});
