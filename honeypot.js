const fs = require('fs');
const path = require('path');

const HONEYPOT_DIR = path.join(__dirname, 'private', 'honeypot');
const MEDIA_PREFIX = '/_internal/f/';

const IMAGE_IDS = ['01', '02', '03', '04', '05', '06', '07'];

function mediaUrl(id) {
  return `${MEDIA_PREFIX}${id}.png`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function honeypotHeaders(res) {
  res.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
}

function directoryListing(title, entries) {
  const rows = entries
    .map(
      (e) =>
        `<tr><td><a href="${escapeHtml(e.href)}">${escapeHtml(e.name)}</a></td>` +
        `<td align="right">${escapeHtml(e.modified)}</td>` +
        `<td align="right">${escapeHtml(e.size)}</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Index of ${escapeHtml(title)}</title>
<style>body{font:13px monospace;background:#111;color:#ccc;margin:24px}h1{font-size:18px}a{color:#6cf}table{width:100%;max-width:720px}td{padding:4px 12px 4px 0}</style>
</head><body>
<h1>Index of ${escapeHtml(title)}</h1>
<hr><table>
<tr><th>Name</th><th align="right">Last modified</th><th align="right">Size</th></tr>
${rows}
</table><hr><address>Fauck Zini Internal Server</address>
</body></html>`;
}

function galleryPage(title, subtitle, imageIds) {
  const imgs = imageIds
    .map(
      (id) =>
        `<figure><a href="${mediaUrl(id)}"><img src="${mediaUrl(id)}" alt="" loading="lazy"></a></figure>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#0a0a0a;color:#eee;font:14px/1.4 monospace}
header{padding:16px 20px;border-bottom:1px solid #333}h1{margin:0;font-size:16px}p{margin:6px 0 0;color:#888}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;padding:16px}
figure{margin:0;background:#151515;border:1px solid #2a2a2a;border-radius:6px;overflow:hidden}
img{display:block;width:100%;height:auto;cursor:pointer}
</style></head><body>
<header><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></header>
<div class="grid">${imgs}</div>
</body></html>`;
}

function fakeEnvPage() {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>.env</title>
<style>body{background:#1e1e1e;color:#d4d4d4;font:13px monospace;padding:20px}pre{white-space:pre-wrap}</style>
</head><body><pre># DATABASE_URL=postgresql://...
# SESSION_SECRET=you_wish
# ADMIN_EMAILS=nice_try@localhost

# bonus folder ↓
<a href="/admin-panel/private/">/admin-panel/private/</a></pre>
<p><img src="${mediaUrl('03')}" alt="" style="max-width:100%;margin-top:16px"></p>
</body></html>`;
}

function fakeJsonPage() {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>package.json</title>
<style>body{background:#1e1e1e;color:#9cdcfe;font:13px monospace;padding:20px}</style>
</head><body><pre>{
  "name": "fauck-zini",
  "private": true,
  "scripts": { "start": "node server.js" },
  "_comment": "see also <a href=\\"/backup/leaks/\\">/backup/leaks/</a>"
}</pre>
<p><img src="${mediaUrl('05')}" alt="" style="max-width:100%;margin-top:16px"></p>
</body></html>`;
}

function singleImagePage(title, imageId) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh}
img{max-width:100%;max-height:100vh}</style></head><body>
<img src="${mediaUrl(imageId)}" alt="">
</body></html>`;
}

const TRAP_ROUTES = [
  {
    match: (p) => p === '/server.js',
    handler: (_req, res) => {
      honeypotHeaders(res);
      res.type('html').send(
        galleryPage('server.js — internal build', 'restricted / src / runtime', ['01', '02', '03'])
      );
    },
  },
  {
    match: (p) => p === '/db.js',
    handler: (_req, res) => {
      honeypotHeaders(res);
      res.type('html').send(singleImagePage('db.js', '04'));
    },
  },
  {
    match: (p) => p === '/config.js' || p === '/game-logic.js',
    handler: (_req, res) => {
      honeypotHeaders(res);
      res.type('html').send(singleImagePage('config', '06'));
    },
  },
  {
    match: (p) => p === '/.env' || p === '/.env.local' || p === '/.env.production',
    handler: (_req, res) => {
      honeypotHeaders(res);
      res.type('html').send(fakeEnvPage());
    },
  },
  {
    match: (p) => p === '/package.json' || p === '/package-lock.json',
    handler: (_req, res) => {
      honeypotHeaders(res);
      res.type('html').send(fakeJsonPage());
    },
  },
  {
    match: (p) => p === '/admin.js' || p === '/admin.css' || p === '/admin.html',
    handler: (_req, res) => {
      honeypotHeaders(res);
      res.type('html').send(
        galleryPage('admin assets', 'unauthorized mirror', ['05', '06', '07'])
      );
    },
  },
  {
    match: (p) => p === '/admin-panel' || p === '/admin-panel/',
    handler: (_req, res) => {
      honeypotHeaders(res);
      res.type('html').send(
        directoryListing('/admin-panel', [
          { name: '../', href: '/', modified: '-', size: '-' },
          { name: 'login.php', href: '/admin-panel/login.php', modified: '2024-11-02 03:14', size: '2.1K' },
          { name: 'private/', href: '/admin-panel/private/', modified: '2026-01-15 22:08', size: '-' },
          { name: 'users.sql', href: '/admin-panel/users.sql', modified: '2025-08-19 11:44', size: '48K' },
          { name: 'config.bak', href: '/admin-panel/config.bak', modified: '2025-12-01 09:02', size: '512' },
        ])
      );
    },
  },
  {
    match: (p) => p === '/admin-panel/private' || p === '/admin-panel/private/',
    handler: (_req, res) => {
      honeypotHeaders(res);
      res.type('html').send(
        galleryPage('admin-panel / private', 'access logged. enjoy.', IMAGE_IDS)
      );
    },
  },
  {
    match: (p) =>
      p === '/admin-panel/login.php' ||
      p === '/admin-panel/users.sql' ||
      p === '/admin-panel/config.bak',
    handler: (_req, res) => {
      honeypotHeaders(res);
      res.type('html').send(singleImagePage(path.basename(p), '02'));
    },
  },
  {
    match: (p) => p === '/backup' || p === '/backup/',
    handler: (_req, res) => {
      honeypotHeaders(res);
      res.type('html').send(
        directoryListing('/backup', [
          { name: '../', href: '/', modified: '-', size: '-' },
          { name: 'leaks/', href: '/backup/leaks/', modified: '2026-02-28 01:33', size: '-' },
          { name: 'store.json', href: '/backup/store.json', modified: '2026-03-01 18:20', size: '1.2M' },
          { name: 'database.dump', href: '/backup/database.dump', modified: '2026-03-01 18:21', size: '4.8M' },
        ])
      );
    },
  },
  {
    match: (p) => p === '/backup/leaks' || p === '/backup/leaks/',
    handler: (_req, res) => {
      honeypotHeaders(res);
      res.type('html').send(galleryPage('backup / leaks', 'full archive', ['04', '05', '06', '07']));
    },
  },
  {
    match: (p) => p === '/backup/store.json' || p === '/backup/database.dump',
    handler: (_req, res) => {
      honeypotHeaders(res);
      res.type('html').send(singleImagePage('backup', '01'));
    },
  },
  {
    match: (p) => p === '/src' || p === '/src/',
    handler: (_req, res) => {
      honeypotHeaders(res);
      res.type('html').send(
        directoryListing('/src', [
          { name: '../', href: '/', modified: '-', size: '-' },
          { name: 'server.js', href: '/server.js', modified: '2026-03-10 12:00', size: '24K' },
          { name: 'db.js', href: '/db.js', modified: '2026-03-10 12:00', size: '18K' },
          { name: 'secrets/', href: '/admin-panel/private/', modified: '2026-01-15 22:08', size: '-' },
        ])
      );
    },
  },
  {
    match: (p) =>
      p === '/wp-admin' ||
      p === '/wp-admin/' ||
      p === '/phpmyadmin' ||
      p === '/phpmyadmin/' ||
      p === '/.git/config' ||
      p === '/.git/HEAD',
    handler: (_req, res) => {
      honeypotHeaders(res);
      res.type('html').send(singleImagePage('nice try', '07'));
    },
  },
];

function isHoneypotPath(p) {
  const normalized = p.split('?')[0].replace(/\/+$/, '') || '/';
  const withSlash = normalized.endsWith('/') ? normalized : normalized;
  return TRAP_ROUTES.some((r) => r.match(p) || r.match(normalized) || r.match(withSlash + '/'));
}

function logProbe(req, pathLabel) {
  const ip = req.ip || req.socket?.remoteAddress || '?';
  const ua = (req.get('user-agent') || '').slice(0, 120);
  console.warn(`[honeypot] ${ip} → ${pathLabel} | ${ua}`);
}

function registerHoneypot(app) {
  app.get(`${MEDIA_PREFIX}:file`, (req, res) => {
    const file = path.basename(req.params.file || '');
    if (!/^(0[1-7])\.png$/i.test(file)) return res.status(404).end();

    const filePath = path.join(HONEYPOT_DIR, file.toLowerCase());
    if (!filePath.startsWith(HONEYPOT_DIR) || !fs.existsSync(filePath)) {
      return res.status(404).end();
    }

    logProbe(req, `media:${file}`);
    honeypotHeaders(res);
    res.type('image/png').send(fs.readFileSync(filePath));
  });

  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const trap = TRAP_ROUTES.find((r) => r.match(req.path));
    if (!trap) return next();
    logProbe(req, req.path);
    if (req.method === 'HEAD') {
      honeypotHeaders(res);
      return res.status(200).end();
    }
    return trap.handler(req, res);
  });
}

function sendAdminHoneypot(req, res) {
  logProbe(req, '/admin (denied)');
  honeypotHeaders(res);
  res.type('html').send(
    galleryPage(
      'Admin Panel — Access Denied',
      'insufficient privileges. incident recorded.',
      ['01', '02', '03', '04']
    )
  );
}

module.exports = {
  registerHoneypot,
  sendAdminHoneypot,
  isHoneypotPath,
  MEDIA_PREFIX,
};
