require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./db');
const antiCheat = require('./anti-cheat');
const {
  applyPassive,
  applyTap,
  applyBuyUpgrade,
  defaultSave,
} = require('./game-logic');

const port = Number(process.env.PORT) || 3000;
const baseUrl = (process.env.BASE_URL || `http://localhost:${port}`).replace(/\/$/, '');
const isProduction = process.env.NODE_ENV === 'production';

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
      secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
      resave: false,
      saveUninitialized: false,
      store: db.getSessionStore(),
      cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
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
    try {
      const user = await db.getUserById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.get('/api/config', (_req, res) => {
    res.json({ googleAuth: isGoogleConfigured(), baseUrl });
  });

  app.get('/auth/google', (req, res, next) => {
    if (!isGoogleConfigured()) return res.redirect('/?auth=not_configured');
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
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
      email: req.user.email,
      avatar: req.user.avatar,
      banned: req.user.banned,
      isAdmin: isAdmin(req.user),
    });
  });

  app.get('/api/leaderboard', async (_req, res) => {
    try {
      const top = await db.getLeaderboard(5);
      res.json({ top });
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
      const check = antiCheat.validateTap(req.user.id);
      if (!check.allowed) {
        await db.incrementSuspicious(req.user.id);
        if (check.flagged) {
          await db.setBanned(req.user.id, true, 'Автокликер');
          return res.status(403).json({ error: 'banned', reason: 'Автокликер' });
        }
        return res.status(429).json({ error: check.reason, violations: check.violations });
      }

      const save = await db.getOrCreateSave(req.user.id);
      applyPassive(save);
      const result = applyTap(save);
      if (!result.ok) return res.status(400).json({ error: result.reason });

      await db.upsertSave(req.user.id, save);
      res.json({ save, earned: result.earned });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Tap failed' });
    }
  });

  app.post('/api/tick', requireAuth, async (req, res) => {
    try {
      const save = await db.getOrCreateSave(req.user.id);
      applyPassive(save);
      await db.upsertSave(req.user.id, save);
      res.json({ save });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Tick failed' });
    }
  });

  app.post('/api/buy-upgrade', requireAuth, async (req, res) => {
    try {
      const { upgradeId } = req.body;
      const save = await db.getOrCreateSave(req.user.id);
      applyPassive(save);
      const result = applyBuyUpgrade(save, upgradeId);
      if (!result.ok) return res.status(400).json({ error: result.reason });
      await db.upsertSave(req.user.id, save);
      res.json({ save, price: result.price });
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
      res.json({ avatar: user.avatar });
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
      const { userId, delta, set } = req.body;
      let save;
      if (set !== undefined) save = await db.setBalance(userId, Number(set));
      else save = await db.adjustBalance(userId, Number(delta) || 0);
      res.json({ ok: true, balance: save.balance });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Adjust failed' });
    }
  });

  app.get('/admin', (req, res) => {
    if (!req.isAuthenticated() || !isAdmin(req.user)) {
      return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'admin.html'));
  });

  app.use((req, res, next) => {
    if (/\.(html|js|css)$/.test(req.path)) {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
  });

  app.use(express.static(path.join(__dirname), { index: false, maxAge: 0 }));

  app.get('*', (_req, res) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  app.listen(port, '0.0.0.0', () => {
    console.log(`Fauck Zini running on ${baseUrl}`);
    if (ADMIN_EMAILS.size) console.log(`Admins: ${[...ADMIN_EMAILS].join(', ')}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
