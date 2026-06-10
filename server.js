require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs');
const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./db');
const antiCheat = require('./anti-cheat');
const { withUserLock } = require('./user-lock');
const { registerHoneypot, sendAdminHoneypot } = require('./honeypot');
const {
  createRateLimiter,
  securityHeaders,
  contentSecurityPolicy,
  blockUnsafeMethods,
  blockRealSensitivePaths,
  sanitizeText,
} = require('./security');
const {
  UPGRADES,
  POKEMONS,
  applyPassive,
  applyTap,
  applyBuyUpgrade,
  applyBuyPokemon,
  mergeUpgradeLevelsSafely,
  reconcileSaves,
  syncMaxLevel,
} = require('./game-logic');

const port = Number(process.env.PORT) || 3000;
const baseUrl = (process.env.BASE_URL || `http://localhost:${port}`).replace(/\/$/, '');
const isProduction = process.env.NODE_ENV === 'production';
const ASSET_VERSION =
  process.env.RAILWAY_DEPLOYMENT_ID ||
  process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 12) ||
  `local-${Date.now()}`;

function sendHtml(res, filename) {
  const filePath = path.join(__dirname, filename);
  let html = fs.readFileSync(filePath, 'utf8');
  html = html.replace(/v=[^"'\s>]+/g, `v=${ASSET_VERSION}`);
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.type('html').send(html);
}

function parseEmailSet(raw) {
  return new Set(
    (raw || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

const ADMIN_EMAILS = parseEmailSet(process.env.ADMIN_EMAILS);
const VIP_EMAILS = parseEmailSet(
  process.env.VIP_EMAILS || 'volodya22788@gmail.com'
);

const PLACEHOLDER_IDS = new Set([
  'your-client-id.apps.googleusercontent.com',
  'your-client-id',
]);

function isGoogleConfigured() {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!id || !secret) return false;
  if (PLACEHOLDER_IDS.has(id)) return false;
  if (secret === 'your-client-secret') return false;
  return true;
}

function isAdmin(user) {
  if (!ADMIN_EMAILS.size) return false;
  const email = user?.email?.trim().toLowerCase();
  return !!email && ADMIN_EMAILS.has(email);
}

function isVova(user) {
  if (!VIP_EMAILS.size) return false;
  const email = user?.email?.trim().toLowerCase();
  return !!email && VIP_EMAILS.has(email);
}

const apiRateLimit = createRateLimiter({
  windowMs: 60_000,
  max: 180,
  name: 'api',
  skip: (req) => req.path.startsWith('/api/config'),
});

const authRateLimit = createRateLimiter({
  windowMs: 60_000,
  max: 30,
  name: 'auth',
});

async function requireAdminPage(req, res, next) {
  if (!ADMIN_EMAILS.size) {
    return sendAdminHoneypot(req, res);
  }
  if (!req.isAuthenticated()) {
    return sendAdminHoneypot(req, res);
  }
  try {
    const user = await db.getUserById(req.user.id);
    if (!user || !isAdmin(user)) return sendAdminHoneypot(req, res);
    next();
  } catch (_) {
    sendAdminHoneypot(req, res);
  }
}

async function requireAdminAsset(req, res, next) {
  if (!req.isAuthenticated() || !ADMIN_EMAILS.size) {
    return res.status(403).end();
  }
  try {
    const user = await db.getUserById(req.user.id);
    if (!user || !isAdmin(user)) return res.status(403).end();
    next();
  } catch (_) {
    res.status(403).end();
  }
}

function sendPublicFile(res, filename, contentType) {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) return res.status(404).end();
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.type(contentType).send(fs.readFileSync(filePath));
}

function getSessionSecret() {
  if (process.env.SESSION_SECRET?.trim()) {
    return process.env.SESSION_SECRET.trim();
  }
  if (process.env.DATABASE_URL) {
    return crypto
      .createHash('sha256')
      .update(`${process.env.DATABASE_URL}:fauckzini-session-v1`)
      .digest('hex');
  }
  return 'dev-secret-change-me';
}

function requireAuth(req, res, next) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  if (req.user.banned) return res.status(403).json({ error: 'banned', reason: req.user.ban_reason });
  next();
}

async function requireAdmin(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (!ADMIN_EMAILS.size) {
    return res.status(403).json({ error: 'Admin disabled' });
  }
  try {
    const user = await db.getUserById(req.user.id);
    if (!user || !isAdmin(user)) {
      return res.status(403).json({ error: 'Admin only' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Auth check failed' });
  }
}

async function start() {
  await db.initDatabase();

  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(securityHeaders(isProduction));
  app.use(blockUnsafeMethods);
  app.use(contentSecurityPolicy);
  registerHoneypot(app);
  app.use(blockRealSensitivePaths);

  app.use(express.json({ limit: '1mb' }));
  app.use(
    session({
      name: 'fauckzini.sid',
      secret: getSessionSecret(),
      resave: false,
      saveUninitialized: false,
      store: db.getSessionStore(),
      rolling: true,
      proxy: true,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 90 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
        path: '/',
      },
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());

  if (isGoogleConfigured()) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${baseUrl}/auth/google/callback`,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const user = await db.findOrCreateUser(profile);
            done(null, user);
          } catch (err) {
            done(err);
          }
        }
      )
    );
  } else {
    console.warn('Google OAuth not configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
  }

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const user = await db.getUserById(id);
        return done(null, user || false);
      } catch (err) {
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
          continue;
        }
        return done(err);
      }
    }
  });

  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(
      'User-agent: *\nDisallow: /admin\nDisallow: /admin-panel\nDisallow: /backup\nDisallow: /api/\nDisallow: /_internal/\n'
    );
  });

  app.get('/api/config', (_req, res) => {
    res.json({ googleAuth: isGoogleConfigured(), assetVersion: ASSET_VERSION });
  });

  app.use('/api', apiRateLimit);

  app.get('/auth/google', authRateLimit, (req, res, next) => {
    if (!isGoogleConfigured()) return res.redirect('/?auth=not_configured');
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
  });

  app.get('/auth/google/silent', (req, res, next) => {
    if (!isGoogleConfigured()) return res.redirect('/');
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      prompt: 'none',
      failureRedirect: '/?auth=need_login',
    })(req, res, next);
  });

  app.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/?auth=failed' }),
    async (req, res) => {
      if (req.user?.banned) {
        req.logout(() => res.redirect('/?auth=banned'));
        return;
      }
      res.redirect('/?auth=success');
    }
  );

  app.post('/auth/logout', authRateLimit, (req, res) => {
    if (req.user) antiCheat.resetTrack(req.user.id);
    req.logout((err) => {
      if (err) return res.status(500).json({ error: 'Logout failed' });
      req.session.destroy(() => res.json({ ok: true }));
    });
  });

  app.get('/api/me', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not logged in' });
    try {
      const user = await db.getUserById(req.user.id);
      if (!user) return res.status(401).json({ error: 'Not logged in' });
      const payload = {
        id: user.id,
        name: user.name,
        nickname: user.nickname || null,
        displayName: user.displayName,
        avatar: user.avatar,
        hasCustomAvatar: !!user.custom_avatar,
        banned: user.banned,
      };
      if (isAdmin(user)) payload.isAdmin = true;
      if (isVova(user)) {
        payload.isVova = true;
        payload.displayName = 'Вова Зинченко';
      }
      res.json(payload);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load profile' });
    }
  });

  app.get('/api/users/:id/avatar', async (req, res) => {
    try {
      const userId = Number(req.params.id);
      if (!Number.isFinite(userId)) return res.status(400).end();
      const payload = await db.getAvatarPayload(userId);
      if (!payload) return res.status(404).end();
      if (payload.type === 'redirect') return res.redirect(payload.url);
      res.set('Content-Type', payload.mime);
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.send(payload.data);
    } catch (err) {
      console.error(err);
      res.status(500).end();
    }
  });

  app.get('/api/leaderboard', async (req, res) => {
    try {
      const players = await db.getLeaderboard(VIP_EMAILS);
      const myId = req.user?.id != null ? Number(req.user.id) : null;
      let myRank = null;
      const enriched = players.map((p) => {
        const isMe = !!(myId && Number(p.id) === myId);
        if (isMe) myRank = p.rank;
        return { ...p, isMe };
      });
      res.json({ players: enriched, total: enriched.length, myRank });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load leaderboard' });
    }
  });

  app.get('/api/save', requireAuth, async (req, res) => {
    try {
      let save = await db.getOrCreateSave(req.user.id);
      applyPassive(save);
      await db.upsertSave(req.user.id, save);
      res.json({ save });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load save' });
    }
  });

  app.post('/api/tap', requireAuth, async (req, res) => {
    try {
      await withUserLock(req.user.id, async () => {
        const check = antiCheat.validateTap(req.user.id);
        if (!check.allowed) {
          await db.incrementSuspicious(req.user.id);
          if (check.flagged) {
            await db.setBanned(req.user.id, true, 'Автокликер');
            res.status(403).json({ error: 'banned', reason: 'Автокликер' });
            return;
          }
          res.status(429).json({ error: check.reason, violations: check.violations });
          return;
        }

        const save = await db.getOrCreateSave(req.user.id);
        applyPassive(save);
        const result = applyTap(save);
        if (!result.ok) {
          res.status(400).json({ error: result.reason });
          return;
        }

        await db.upsertSave(req.user.id, save);
        res.json({ save, earned: result.earned });
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Tap failed' });
    }
  });

  app.post('/api/tick', requireAuth, async (req, res) => {
    try {
      const tickCheck = antiCheat.validateTick(req.user.id);
      if (!tickCheck.allowed) {
        const save = await db.getOrCreateSave(req.user.id);
        return res.json({ save });
      }

      await withUserLock(req.user.id, async () => {
        const save = await db.getOrCreateSave(req.user.id);
        const { punchEvents } = applyPassive(save);
        await db.upsertSave(req.user.id, save);
        res.json({ save, punchEvents: punchEvents || [] });
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Tick failed' });
    }
  });

  app.post('/api/buy-upgrade', requireAuth, async (req, res) => {
    try {
      const { upgradeId } = req.body;
      if (!UPGRADES.some((u) => u.id === upgradeId)) {
        return res.status(400).json({ error: 'invalid_upgrade' });
      }

      await withUserLock(req.user.id, async () => {
        const save = await db.getOrCreateSave(req.user.id);
        applyPassive(save);
        const result = applyBuyUpgrade(save, upgradeId);
        if (!result.ok) {
          res.status(400).json({ error: result.reason });
          return;
        }
        await db.upsertSave(req.user.id, save);
        res.json({ save, price: result.price });
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Buy failed' });
    }
  });

  app.post('/api/buy-pokemon', requireAuth, async (req, res) => {
    try {
      const { pokemonId } = req.body;
      if (!POKEMONS.some((p) => p.id === pokemonId)) {
        return res.status(400).json({ error: 'invalid_pokemon' });
      }

      await withUserLock(req.user.id, async () => {
        const save = await db.getOrCreateSave(req.user.id);
        applyPassive(save);
        const result = applyBuyPokemon(save, pokemonId);
        if (!result.ok) {
          res.status(400).json({ error: result.reason });
          return;
        }
        await db.upsertSave(req.user.id, save);
        res.json({ save, price: result.price });
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Buy pokemon failed' });
    }
  });

  app.put('/api/save', requireAuth, async (req, res) => {
    res.status(403).json({
      error: 'direct_save_disabled',
      message: 'Use /api/tap and /api/buy-upgrade',
    });
  });

  app.post('/api/save/sync', requireAuth, (_req, res) => {
    res.status(403).json({
      error: 'sync_disabled',
      message: 'Server-authoritative saves only. Use /api/tap and /api/buy-upgrade.',
    });
  });

  app.post('/api/save/migrate', requireAuth, async (req, res) => {
    try {
      await withUserLock(req.user.id, async () => {
        const incoming = req.body || {};
        const save = await db.getOrCreateSave(req.user.id);
        save.upgradeLevels = mergeUpgradeLevelsSafely(save, incoming.upgradeLevels);
        applyPassive(save);
        syncMaxLevel(save);
        await db.upsertSave(req.user.id, save);
        res.json({ save, migrated: true });
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Migrate failed' });
    }
  });

  app.post('/api/save/reconcile', requireAuth, async (req, res) => {
    try {
      await withUserLock(req.user.id, async () => {
        const server = await db.getOrCreateSave(req.user.id);
        const merged = reconcileSaves(server, req.body || {});
        applyPassive(merged);
        await db.upsertSave(req.user.id, merged);
        res.json({ save: merged, reconciled: true });
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Reconcile failed' });
    }
  });

  app.post('/api/nickname', requireAuth, async (req, res) => {
    try {
      await db.setNickname(req.user.id, req.body?.nickname);
      const user = await db.getUserById(req.user.id);
      res.json({
        ok: true,
        nickname: user.nickname,
        displayName: user.displayName,
      });
    } catch (err) {
      if (err.message === 'INVALID_LENGTH') {
        return res.status(400).json({ error: 'Ник: от 2 до 20 символов' });
      }
      if (err.message === 'INVALID_CHARS') {
        return res.status(400).json({ error: 'Только буквы, цифры, пробел, _ и -' });
      }
      console.error(err);
      res.status(500).json({ error: 'Не удалось сохранить ник' });
    }
  });

  app.post('/api/avatar', requireAuth, async (req, res) => {
    try {
      const { image } = req.body;
      if (!image || !image.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Invalid image' });
      }
      if (image.length > 2_500_000) {
        return res.status(400).json({ error: 'Image too large (max 2MB)' });
      }
      await db.setCustomAvatar(req.user.id, image);
      const user = await db.getUserById(req.user.id);
      res.json({ avatar: user.avatar, hasCustomAvatar: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Avatar upload failed' });
    }
  });

  app.get('/api/admin/players', requireAdmin, async (_req, res) => {
    try {
      const players = await db.getAllPlayers();
      res.json({ players });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load players' });
    }
  });

  app.post('/api/admin/ban', requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.body.userId);
      if (!Number.isFinite(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user' });
      }
      if (userId === req.user.id) {
        return res.status(400).json({ error: 'Cannot ban yourself' });
      }
      const reason = sanitizeText(req.body.reason, 200) || 'Нарушение правил';
      await db.setBanned(userId, true, reason);
      antiCheat.resetTrack(userId);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Ban failed' });
    }
  });

  app.post('/api/admin/unban', requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.body.userId);
      if (!Number.isFinite(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user' });
      }
      await db.setBanned(userId, false, null);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Unban failed' });
    }
  });

  app.post('/api/admin/adjust-balance', requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.body.userId);
      if (!Number.isFinite(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user' });
      }

      let save;
      if (req.body.set !== undefined) save = await db.setBalance(userId, Number(req.body.set));
      else save = await db.adjustBalance(userId, Number(req.body.delta) || 0);

      if (req.body.setEarned !== undefined) {
        save = await db.setTotalEarned(userId, Number(req.body.setEarned));
      }

      res.json({
        ok: true,
        balance: save.balance,
        totalEarned: save.totalEarned,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Adjust failed' });
    }
  });

  app.post('/api/admin/reset', requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.body.userId);
      if (!Number.isFinite(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user' });
      }
      const save = await db.resetPlayerProgress(userId);
      antiCheat.resetTrack(userId);
      res.json({ ok: true, save });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Reset failed' });
    }
  });

  app.get('/admin', requireAdminPage, (_req, res) => {
    sendHtml(res, 'admin.html');
  });

  app.get('/admin/assets/app.css', requireAdminAsset, (_req, res) => {
    sendPublicFile(res, 'admin.css', 'text/css');
  });

  app.get('/admin/assets/app.js', requireAdminAsset, (_req, res) => {
    sendPublicFile(res, 'admin.js', 'application/javascript');
  });

  app.get('/game.js', (_req, res) => {
    sendPublicFile(res, 'game.js', 'application/javascript');
  });

  app.get('/styles.css', (_req, res) => {
    sendPublicFile(res, 'styles.css', 'text/css');
  });

  app.use(
    '/assets',
    express.static(path.join(__dirname, 'assets'), {
      index: false,
      dotfiles: 'deny',
      maxAge: isProduction ? '7d' : 0,
      fallthrough: false,
    })
  );

  app.use('/private', (_req, res) => res.status(404).end());

  app.get('*', (req, res) => {
    if (req.path.includes('.')) return res.status(404).end();
    sendHtml(res, 'index.html');
  });

  const userCount = await db.getRegisteredUserCount();

  app.listen(port, '0.0.0.0', () => {
    console.log(`Fauck Zini running on ${baseUrl}`);
    console.log(`Asset version: ${ASSET_VERSION}`);
    if (ADMIN_EMAILS.size) {
      console.log(`Admin panel enabled (${ADMIN_EMAILS.size} email(s)) → ${baseUrl}/admin`);
    } else {
      console.warn('ADMIN_EMAILS not set — admin panel disabled');
    }
    if (VIP_EMAILS.size) {
      console.log(`VIP player(s): ${VIP_EMAILS.size} email(s) configured`);
    }
    console.log(
      process.env.SESSION_SECRET?.trim()
        ? 'Sessions: custom SESSION_SECRET'
        : 'Sessions: stable secret from DATABASE_URL'
    );
    console.log(`Registered users in database: ${userCount}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
