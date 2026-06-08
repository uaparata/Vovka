const path = require('path');
const fs = require('fs');

let mode = null;
let pool = null;
let fileDb = null;

const FILE_DB_PATH = path.join(__dirname, 'data', 'store.json');

function loadFileDb() {
  const dataDir = path.dirname(FILE_DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(FILE_DB_PATH)) {
    const empty = { users: [], saves: [], nextUserId: 1 };
    fs.writeFileSync(FILE_DB_PATH, JSON.stringify(empty, null, 2));
    return empty;
  }
  return JSON.parse(fs.readFileSync(FILE_DB_PATH, 'utf8'));
}

function saveFileDb() {
  fs.writeFileSync(FILE_DB_PATH, JSON.stringify(fileDb, null, 2));
}

async function initDatabase() {
  if (process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost')
        ? false
        : { rejectUnauthorized: false },
    });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id TEXT UNIQUE NOT NULL,
        email TEXT,
        name TEXT,
        avatar TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS saves (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        balance DOUBLE PRECISION DEFAULT 0,
        energy DOUBLE PRECISION DEFAULT 1000,
        total_taps INTEGER DEFAULT 0,
        total_earned DOUBLE PRECISION DEFAULT 0,
        upgrade_levels JSONB DEFAULT '{}',
        last_passive BIGINT DEFAULT 0,
        last_save BIGINT DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR NOT NULL PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);
    `);
    mode = 'pg';
    console.log('Database: PostgreSQL');
    return;
  }

  fileDb = loadFileDb();
  mode = 'file';
  console.log('Database: JSON file (local dev only)');
}

function rowToSave(row) {
  if (!row) return null;
  const levels =
    typeof row.upgrade_levels === 'string'
      ? JSON.parse(row.upgrade_levels)
      : row.upgrade_levels || {};
  return {
    balance: row.balance,
    energy: row.energy,
    totalTaps: row.total_taps,
    totalEarned: row.total_earned,
    upgradeLevels: levels,
    lastPassive: Number(row.last_passive),
    lastSave: Number(row.last_save),
  };
}

async function findOrCreateUser(profile) {
  const googleId = profile.id;
  const email = profile.emails?.[0]?.value || null;
  const name = profile.displayName || null;
  const avatar = profile.photos?.[0]?.value || null;

  if (mode === 'pg') {
    const existing = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    if (existing.rows[0]) return existing.rows[0];
    const inserted = await pool.query(
      `INSERT INTO users (google_id, email, name, avatar)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [googleId, email, name, avatar]
    );
    return inserted.rows[0];
  }

  const existing = fileDb.users.find((u) => u.google_id === googleId);
  if (existing) return existing;
  const user = {
    id: fileDb.nextUserId++,
    google_id: googleId,
    email,
    name,
    avatar,
    created_at: new Date().toISOString(),
  };
  fileDb.users.push(user);
  saveFileDb();
  return user;
}

async function getUserById(id) {
  if (mode === 'pg') {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
  return fileDb.users.find((u) => u.id === id) || null;
}

async function getSave(userId) {
  if (mode === 'pg') {
    const res = await pool.query('SELECT * FROM saves WHERE user_id = $1', [userId]);
    return rowToSave(res.rows[0]);
  }
  const row = fileDb.saves.find((s) => s.user_id === userId);
  return rowToSave(row);
}

async function upsertSave(userId, save) {
  const levels = save.upgradeLevels || {};
  const payload = {
    user_id: userId,
    balance: save.balance ?? 0,
    energy: save.energy ?? 1000,
    total_taps: save.totalTaps ?? 0,
    total_earned: save.totalEarned ?? 0,
    upgrade_levels: levels,
    last_passive: save.lastPassive ?? Date.now(),
    last_save: save.lastSave ?? Date.now(),
    updated_at: new Date().toISOString(),
  };

  if (mode === 'pg') {
    await pool.query(
      `INSERT INTO saves (user_id, balance, energy, total_taps, total_earned, upgrade_levels, last_passive, last_save)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id) DO UPDATE SET
         balance = EXCLUDED.balance,
         energy = EXCLUDED.energy,
         total_taps = EXCLUDED.total_taps,
         total_earned = EXCLUDED.total_earned,
         upgrade_levels = EXCLUDED.upgrade_levels,
         last_passive = EXCLUDED.last_passive,
         last_save = EXCLUDED.last_save,
         updated_at = NOW()`,
      [
        userId,
        payload.balance,
        payload.energy,
        payload.total_taps,
        payload.total_earned,
        JSON.stringify(levels),
        payload.last_passive,
        payload.last_save,
      ]
    );
    return;
  }

  const idx = fileDb.saves.findIndex((s) => s.user_id === userId);
  if (idx >= 0) fileDb.saves[idx] = payload;
  else fileDb.saves.push(payload);
  saveFileDb();
}

function getSessionStore() {
  if (mode === 'pg') {
    const session = require('express-session');
    const pgSession = require('connect-pg-simple')(session);
    return new pgSession({
      pool,
      tableName: 'sessions',
      createTableIfMissing: true,
    });
  }
  return undefined;
}

module.exports = {
  initDatabase,
  findOrCreateUser,
  getUserById,
  getSave,
  upsertSave,
  getSessionStore,
};
