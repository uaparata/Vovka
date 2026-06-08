const path = require('path');
const fs = require('fs');

let mode = null;
let pool = null;
let sqlite = null;

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

  const Database = require('better-sqlite3');
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  sqlite = new Database(path.join(dataDir, 'game.db'));
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT,
      name TEXT,
      avatar TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS saves (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      balance REAL DEFAULT 0,
      energy REAL DEFAULT 1000,
      total_taps INTEGER DEFAULT 0,
      total_earned REAL DEFAULT 0,
      upgrade_levels TEXT DEFAULT '{}',
      last_passive INTEGER DEFAULT 0,
      last_save INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  mode = 'sqlite';
  console.log('Database: SQLite (local dev)');
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

  const existing = sqlite.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);
  if (existing) return existing;
  const info = sqlite
    .prepare('INSERT INTO users (google_id, email, name, avatar) VALUES (?, ?, ?, ?)')
    .run(googleId, email, name, avatar);
  return sqlite.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
}

async function getUserById(id) {
  if (mode === 'pg') {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
  return sqlite.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
}

async function getSave(userId) {
  if (mode === 'pg') {
    const res = await pool.query('SELECT * FROM saves WHERE user_id = $1', [userId]);
    return rowToSave(res.rows[0]);
  }
  const row = sqlite.prepare('SELECT * FROM saves WHERE user_id = ?').get(userId);
  return rowToSave(row);
}

async function upsertSave(userId, save) {
  const levels = JSON.stringify(save.upgradeLevels || {});
  const payload = [
    userId,
    save.balance ?? 0,
    save.energy ?? 1000,
    save.totalTaps ?? 0,
    save.totalEarned ?? 0,
    levels,
    save.lastPassive ?? Date.now(),
    save.lastSave ?? Date.now(),
  ];

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
      payload
    );
    return;
  }

  sqlite
    .prepare(
      `INSERT INTO saves (user_id, balance, energy, total_taps, total_earned, upgrade_levels, last_passive, last_save)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         balance = excluded.balance,
         energy = excluded.energy,
         total_taps = excluded.total_taps,
         total_earned = excluded.total_earned,
         upgrade_levels = excluded.upgrade_levels,
         last_passive = excluded.last_passive,
         last_save = excluded.last_save,
         updated_at = datetime('now')`
    )
    .run(...payload);
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
