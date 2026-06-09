const MIN_TICK_INTERVAL_MS = 3000;

const tickHistory = new Map();

function validateTap(_userId) {
  return { allowed: true, violations: 0, flagged: false };
}

function validateTick(userId, now = Date.now()) {
  const last = tickHistory.get(userId) || 0;
  if (now - last < MIN_TICK_INTERVAL_MS) {
    return { allowed: false, reason: 'tick_rate' };
  }
  tickHistory.set(userId, now);
  return { allowed: true };
}

function resetTrack(userId) {
  tickHistory.delete(userId);
}

module.exports = {
  validateTap,
  validateTick,
  resetTrack,
};
