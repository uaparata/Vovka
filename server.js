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
const {
  UPGRADES,
  applyPassive,
  applyTap,
  applyBuyUpgrade,
  mergeUpgradeLevelsSafely,
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
  html = html.replace(/v=\d+/g, `v=${ASSET_VERSION}`);
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.type('html').send(html);
}

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
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
  return user?.email && ADMIN_EMAILS.has(user.email.toLowerCase());
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

function requireAdmin(req, res, next) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  if (!isAdmin(req.user)) return res.status(403).json({ error: 'Admin only' });
  next();
}

async function start() {
  await db.initDatabase();

  const app = express();
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '3mb' }));
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

  app.get('/api/config', (_req, res) => {
    res.json({ googleAuth: isGoogleConfigured(), baseUrl, assetVersion: ASSET_VERSION });
  });

  app.get('/api/version', (_req, res) => {
    res.json({ ok: true, assetVersion: ASSET_VERSION, build: '2026-06-08-big-tap' });
  });

  app.get('/auth/google', (req, res, next) => {
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

  app.post('/auth/logout', (req, res) => {
    if (req.user) antiCheat.resetTrack(req.user.id);
    req.logout((err) => {
      if (err) return res.status(500).json({ error: 'Logout failed' });
      req.session.destroy(() => res.json({ ok: true }));
    });
  });

  app.get('/api/me', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not logged in' });
    res.json({
      id: req.user.id,
      name: req.user.name,
      nickname: req.user.nickname || null,
      displayName: req.user.displayName,
      email: req.user.email,
      avatar: req.user.avatar,
      hasCustomAvatar: !!req.user.custom_avatar,
      banned: req.user.banned,
      isAdmin: isAdmin(req.user),
    });
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
      const players = await db.getLeaderboard();
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
        applyPassive(save);
        await db.upsertSave(req.user.id, save);
        res.json({ save });
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
      const { userId, reason } = req.body;
      await db.setBanned(userId, true, reason || 'Нарушение правил');
      antiCheat.resetTrack(userId);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Ban failed' });
    }
  });

  app.post('/api/admin/unban', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.body;
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
      if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid user' });

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
      if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid user' });
      const save = await db.resetPlayerProgress(userId);
      antiCheat.resetTrack(userId);
      res.json({ ok: true, save });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Reset failed' });
    }
  });

  app.get('/admin', (req, res) => {
    if (!req.isAuthenticated() || !isAdmin(req.user)) {
      return res.redirect('/');
    }
    sendHtml(res, 'admin.html');
  });

  app.use((req, res, next) => {
    if (/\.(html|js|css)$/.test(req.path)) {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
  });

  app.use(express.static(path.join(__dirname), { index: false, maxAge: 0 }));

  app.get('*', (_req, res) => {
    sendHtml(res, 'index.html');
  });

  const userCount = await db.getRegisteredUserCount();

  app.listen(port, '0.0.0.0', () => {
    console.log(`Fauck Zini running on ${baseUrl}`);
    console.log(`Asset version: ${ASSET_VERSION}`);
    if (ADMIN_EMAILS.size) {
      console.log(`Admins: ${[...ADMIN_EMAILS].join(', ')}`);
      console.log(`Admin panel: ${baseUrl}/admin`);
    } else {
      console.warn('ADMIN_EMAILS not set — admin panel disabled');
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
