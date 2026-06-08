const path = require('path');
const fs = require('fs');
const { defaultSave } = require('./game-logic');

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
        custom_avatar TEXT,
        banned BOOLEAN DEFAULT FALSE,
        ban_reason TEXT,
        suspicious_count INTEGER DEFAULT 0,
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
        max_level INTEGER DEFAULT 1,
        peak_balance DOUBLE PRECISION DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR NOT NULL PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);
    `);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_avatar TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS suspicious_count INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE saves ADD COLUMN IF NOT EXISTS max_level INTEGER DEFAULT 1`);
    await pool.query(`ALTER TABLE saves ADD COLUMN IF NOT EXISTS peak_balance DOUBLE PRECISION DEFAULT 0`);
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
    balance: Number(row.balance),
    energy: Number(row.energy),
    totalTaps: Number(row.total_taps),
    totalEarned: Number(row.total_earned),
    upgradeLevels: levels,
    lastPassive: Number(row.last_passive),
    lastSave: Number(row.last_save),
    maxLevel: row.max_level ?? 1,
    peakBalance: row.peak_balance ?? 0,
  };
}

function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    google_id: row.google_id,
    email: row.email,
    name: row.name,
    avatar: row.custom_avatar || row.avatar,
    custom_avatar: row.custom_avatar,
    banned: !!row.banned,
    ban_reason: row.ban_reason,
    suspicious_count: row.suspicious_count || 0,
    created_at: row.created_at,
  };
}

async function findOrCreateUser(profile) {
  const googleId = profile.id;
  const email = profile.emails?.[0]?.value || null;
  const name = profile.displayName || null;
  const avatar = profile.photos?.[0]?.value || null;

  if (mode === 'pg') {
    const existing = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    if (existing.rows[0]) return rowToUser(existing.rows[0]);
    const inserted = await pool.query(
      `INSERT INTO users (google_id, email, name, avatar)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [googleId, email, name, avatar]
    );
    return rowToUser(inserted.rows[0]);
  }

  const existing = fileDb.users.find((u) => u.google_id === googleId);
  if (existing) return rowToUser(existing);
  const user = {
    id: fileDb.nextUserId++,
    google_id: googleId,
    email,
    name,
    avatar,
    custom_avatar: null,
    banned: false,
    ban_reason: null,
    suspicious_count: 0,
    created_at: new Date().toISOString(),
  };
  fileDb.users.push(user);
  saveFileDb();
  return rowToUser(user);
}

async function getUserById(id) {
  if (mode === 'pg') {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return rowToUser(res.rows[0]);
  }
  return rowToUser(fileDb.users.find((u) => u.id === id));
}

async function getSave(userId) {
  if (mode === 'pg') {
    const res = await pool.query('SELECT * FROM saves WHERE user_id = $1', [userId]);
    return rowToSave(res.rows[0]);
  }
  const row = fileDb.saves.find((s) => s.user_id === userId);
  return rowToSave(row);
}

async function getOrCreateSave(userId) {
  let save = await getSave(userId);
  if (!save) {
    save = defaultSave();
    await upsertSave(userId, save);
  }
  return save;
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
    max_level: save.maxLevel ?? 1,
    peak_balance: save.peakBalance ?? 0,
    updated_at: new Date().toISOString(),
  };

  if (mode === 'pg') {
    await pool.query(
      `INSERT INTO saves (user_id, balance, energy, total_taps, total_earned, upgrade_levels, last_passive, last_save, max_level, peak_balance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (user_id) DO UPDATE SET
         balance = EXCLUDED.balance,
         energy = EXCLUDED.energy,
         total_taps = EXCLUDED.total_taps,
         total_earned = EXCLUDED.total_earned,
         upgrade_levels = EXCLUDED.upgrade_levels,
         last_passive = EXCLUDED.last_passive,
         last_save = EXCLUDED.last_save,
         max_level = GREATEST(saves.max_level, EXCLUDED.max_level),
         peak_balance = GREATEST(saves.peak_balance, EXCLUDED.peak_balance),
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
        payload.max_level,
        payload.peak_balance,
      ]
    );
    return;
  }

  const idx = fileDb.saves.findIndex((s) => s.user_id === userId);
  if (idx >= 0) {
    const prev = fileDb.saves[idx];
    payload.max_level = Math.max(prev.max_level || 1, payload.max_level || 1);
    payload.peak_balance = Math.max(prev.peak_balance || 0, payload.peak_balance || 0);
    fileDb.saves[idx] = { ...prev, ...payload };
  } else {
    fileDb.saves.push(payload);
  }
  saveFileDb();
}

async function setCustomAvatar(userId, dataUrl) {
  if (mode === 'pg') {
    await pool.query('UPDATE users SET custom_avatar = $1 WHERE id = $2', [dataUrl, userId]);
    return;
  }
  const user = fileDb.users.find((u) => u.id === userId);
  if (user) {
    user.custom_avatar = dataUrl;
    saveFileDb();
  }
}

async function incrementSuspicious(userId, count = 1) {
  if (mode === 'pg') {
    await pool.query(
      'UPDATE users SET suspicious_count = suspicious_count + $1 WHERE id = $2',
      [count, userId]
    );
    return;
  }
  const user = fileDb.users.find((u) => u.id === userId);
  if (user) {
    user.suspicious_count = (user.suspicious_count || 0) + count;
    saveFileDb();
  }
}

async function setBanned(userId, banned, reason = null) {
  if (mode === 'pg') {
    await pool.query('UPDATE users SET banned = $1, ban_reason = $2 WHERE id = $3', [
      banned,
      reason,
      userId,
    ]);
    return;
  }
  const user = fileDb.users.find((u) => u.id === userId);
  if (user) {
    user.banned = banned;
    user.ban_reason = reason;
    saveFileDb();
  }
}

async function adjustBalance(userId, delta) {
  const save = await getOrCreateSave(userId);
  save.balance = Math.max(0, save.balance + delta);
  const { syncMaxLevel } = require('./game-logic');
  syncMaxLevel(save);
  await upsertSave(userId, save);
  return save;
}

async function setBalance(userId, balance) {
  const save = await getOrCreateSave(userId);
  save.balance = Math.max(0, balance);
  const { syncMaxLevel } = require('./game-logic');
  syncMaxLevel(save);
  await upsertSave(userId, save);
  return save;
}

async function getLeaderboard(limit = 5) {
  if (mode === 'pg') {
    const res = await pool.query(
      `SELECT u.id, u.name, u.email, u.custom_avatar, u.avatar, u.banned,
              s.balance, s.max_level, s.total_taps
       FROM saves s
       JOIN users u ON u.id = s.user_id
       WHERE u.banned = FALSE
       ORDER BY s.balance DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows.map((r, i) => ({
      rank: i + 1,
      id: r.id,
      name: r.name || r.email || 'Игрок',
      avatar: r.custom_avatar || r.avatar,
      balance: Number(r.balance),
      maxLevel: r.max_level,
      totalTaps: r.total_taps,
    }));
  }

  const rows = fileDb.saves
    .map((s) => {
      const u = fileDb.users.find((x) => x.id === s.user_id);
      if (!u || u.banned) return null;
      return {
        id: u.id,
        name: u.name || u.email || 'Игрок',
        avatar: u.custom_avatar || u.avatar,
        balance: s.balance,
        maxLevel: s.max_level,
        totalTaps: s.total_taps,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, limit)
    .map((r, i) => ({ rank: i + 1, ...r }));

  return rows;
}

async function getAllPlayers() {
  if (mode === 'pg') {
    const res = await pool.query(
      `SELECT u.id, u.name, u.email, u.custom_avatar, u.avatar, u.banned, u.ban_reason,
              u.suspicious_count, s.balance, s.total_earned, s.total_taps, s.max_level
       FROM users u
       LEFT JOIN saves s ON s.user_id = u.id
       ORDER BY s.balance DESC NULLS LAST`
    );
    return res.rows.map((r) => ({
      id: r.id,
      name: r.name || '—',
      email: r.email || '—',
      avatar: r.custom_avatar || r.avatar,
      banned: !!r.banned,
      banReason: r.ban_reason,
      suspicious: r.suspicious_count || 0,
      balance: Number(r.balance || 0),
      totalEarned: Number(r.total_earned || 0),
      totalTaps: Number(r.total_taps || 0),
      maxLevel: r.max_level || 1,
    }));
  }

  return fileDb.users.map((u) => {
    const s = fileDb.saves.find((x) => x.user_id === u.id);
    return {
      id: u.id,
      name: u.name || '—',
      email: u.email || '—',
      avatar: u.custom_avatar || u.avatar,
      banned: !!u.banned,
      banReason: u.ban_reason,
      suspicious: u.suspicious_count || 0,
      balance: s?.balance || 0,
      totalEarned: s?.total_earned || 0,
      totalTaps: s?.total_taps || 0,
      maxLevel: s?.max_level || 1,
    };
  });
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
  getOrCreateSave,
  upsertSave,
  setCustomAvatar,
  incrementSuspicious,
  setBanned,
  adjustBalance,
  setBalance,
  getLeaderboard,
  getAllPlayers,
  getSessionStore,
};
