require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./db');

const port = Number(process.env.PORT) || 3000;
const baseUrl = (process.env.BASE_URL || `http://localhost:${port}`).replace(/\/$/, '');
const isProduction = process.env.NODE_ENV === 'production';

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

async function start() {
  await db.initDatabase();

  const app = express();
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '64kb' }));
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

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
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

  app.get('/auth/google', (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).send('Google login is not configured on the server.');
    }
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
  });

  app.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/?auth=failed' }),
    (_req, res) => res.redirect('/?auth=success')
  );

  app.post('/auth/logout', (req, res) => {
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
    });
  });

  app.get('/api/save', requireAuth, async (req, res) => {
    try {
      const save = await db.getSave(req.user.id);
      res.json({ save });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load save' });
    }
  });

  app.put('/api/save', requireAuth, async (req, res) => {
    try {
      const { balance, energy, totalTaps, totalEarned, upgradeLevels, lastPassive, lastSave } =
        req.body;
      await db.upsertSave(req.user.id, {
        balance,
        energy,
        totalTaps,
        totalEarned,
        upgradeLevels,
        lastPassive,
        lastSave,
      });
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to save progress' });
    }
  });

  app.use(
    express.static(path.join(__dirname), {
      index: 'index.html',
      maxAge: isProduction ? '1h' : 0,
    })
  );

  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  app.listen(port, '0.0.0.0', () => {
    console.log(`Fauck Zini running on ${baseUrl}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
