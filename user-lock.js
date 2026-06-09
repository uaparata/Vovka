const locks = new Map();

async function withUserLock(userId, fn) {
  const key = String(userId);
  while (locks.get(key)) {
    await new Promise((r) => setTimeout(r, 15));
  }
  locks.set(key, true);
  try {
    return await fn();
  } finally {
    locks.delete(key);
  }
}

module.exports = { withUserLock };
