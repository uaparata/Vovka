const HONEYPOT_MEDIA = '/_internal/f/';

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function createRateLimiter({ windowMs, max, name, skip }) {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of hits) {
      if (now - bucket.start > windowMs) hits.delete(key);
    }
  }, windowMs).unref?.();

  return function rateLimit(req, res, next) {
    if (skip?.(req)) return next();
    const key = `${name}:${clientIp(req)}`;
    const now = Date.now();
    let bucket = hits.get(key);
    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0 };
      hits.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
      if (req.method === 'GET' && req.accepts('html')) {
        return res.redirect('/?auth=rate_limited');
      }
      return res.status(429).json({ error: 'rate_limited' });
    }
    next();
  };
}

function securityHeaders(isProduction) {
  return function apply(_req, res, next) {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.set('X-DNS-Prefetch-Control', 'off');
    res.set('Cross-Origin-Opener-Policy', 'same-origin');
    res.set('Cross-Origin-Resource-Policy', 'same-origin');
    if (isProduction) {
      res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  };
}

function contentSecurityPolicy(req, res, next) {
  if (req.path.startsWith('/api/') || req.path.startsWith(HONEYPOT_MEDIA)) return next();

  const isHoneypotHtml =
    req.path.includes('admin-panel') ||
    req.path.includes('/backup') ||
    req.path === '/server.js' ||
    req.path === '/db.js' ||
    req.path.startsWith('/_internal');

  if (isHoneypotHtml) {
    res.set(
      'Content-Security-Policy',
      "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"
    );
    return next();
  }

  res.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  next();
}

const BLOCKED_METHODS = new Set(['TRACE', 'TRACK', 'CONNECT']);

function blockUnsafeMethods(req, res, next) {
  if (BLOCKED_METHODS.has(req.method)) return res.status(405).end();
  next();
}

const REAL_SENSITIVE =
  /^\/(\.git|node_modules|data|anti-cheat\.js|user-lock\.js|railway\.toml|README\.md)(\/|$)/i;

function blockRealSensitivePaths(req, res, next) {
  const p = req.path;
  if (REAL_SENSITIVE.test(p)) return res.status(404).end();
  if (/^\/admin(\.|\/)/i.test(p) && !/^\/admin$/i.test(p) && !/^\/admin\/assets\//i.test(p)) {
    return res.status(404).end();
  }
  if (/\.(json|toml|md|example)$/i.test(p) && !p.startsWith('/assets/')) {
    return res.status(404).end();
  }
  if (/\.js$/i.test(p) && p !== '/game.js' && !p.startsWith('/admin/assets/')) {
    return res.status(404).end();
  }
  next();
}

function sanitizeText(value, maxLen) {
  if (value == null) return null;
  const s = String(value).trim().slice(0, maxLen);
  return s || null;
}

module.exports = {
  createRateLimiter,
  securityHeaders,
  contentSecurityPolicy,
  blockUnsafeMethods,
  blockRealSensitivePaths,
  sanitizeText,
  clientIp,
};
