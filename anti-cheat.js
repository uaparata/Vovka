// Лимиты под быстрый, но реальный тап пальцем (~12–15/сек максимум у человека)
const MIN_TAP_INTERVAL_MS = 40;
const MAX_TAPS_PER_WINDOW = 16;
const WINDOW_MS = 1000;
const MAX_VIOLATIONS_BEFORE_FLAG = 40;
const VIOLATION_DECAY_EVERY = 8;
const MIN_TICK_INTERVAL_MS = 3000;

const tapHistory = new Map();
const tickHistory = new Map();

function getTrack(userId) {
  if (!tapHistory.has(userId)) {
    tapHistory.set(userId, { times: [], violations: 0, lastTap: 0, allowedSinceFlag: 0 });
  }
  return tapHistory.get(userId);
}

function validateTap(userId, now = Date.now()) {
  const track = getTrack(userId);

  track.times = track.times.filter((t) => now - t < WINDOW_MS);

  const tooSoon = track.lastTap && now - track.lastTap < MIN_TAP_INTERVAL_MS;
  const overWindow = track.times.length >= MAX_TAPS_PER_WINDOW;

  if (tooSoon || overWindow) {
    track.violations++;
    return {
      allowed: false,
      reason: tooSoon ? 'too_fast' : 'rate_limit',
      violations: track.violations,
      flagged: track.violations >= MAX_VIOLATIONS_BEFORE_FLAG,
    };
  }

  track.times.push(now);
  track.lastTap = now;
  track.allowedSinceFlag++;

  if (track.violations > 0 && track.allowedSinceFlag % VIOLATION_DECAY_EVERY === 0) {
    track.violations = Math.max(0, track.violations - 1);
  }

  return { allowed: true, violations: track.violations, flagged: false };
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
  tapHistory.delete(userId);
  tickHistory.delete(userId);
}

module.exports = {
  validateTap,
  validateTick,
  resetTrack,
  MIN_TAP_INTERVAL_MS,
};
