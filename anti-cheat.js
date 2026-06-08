const MIN_TAP_INTERVAL_MS = 85;
const MAX_TAPS_PER_WINDOW = 12;
const WINDOW_MS = 1000;
const MAX_VIOLATIONS_BEFORE_FLAG = 15;

const tapHistory = new Map();

function getTrack(userId) {
  if (!tapHistory.has(userId)) {
    tapHistory.set(userId, { times: [], violations: 0, lastTap: 0 });
  }
  return tapHistory.get(userId);
}

function validateTap(userId, now = Date.now()) {
  const track = getTrack(userId);

  if (track.lastTap && now - track.lastTap < MIN_TAP_INTERVAL_MS) {
    track.violations++;
    return {
      allowed: false,
      reason: 'too_fast',
      violations: track.violations,
      flagged: track.violations >= MAX_VIOLATIONS_BEFORE_FLAG,
    };
  }

  track.times = track.times.filter((t) => now - t < WINDOW_MS);
  if (track.times.length >= MAX_TAPS_PER_WINDOW) {
    track.violations++;
    return {
      allowed: false,
      reason: 'rate_limit',
      violations: track.violations,
      flagged: track.violations >= MAX_VIOLATIONS_BEFORE_FLAG,
    };
  }

  track.times.push(now);
  track.lastTap = now;
  return {
    allowed: true,
    violations: track.violations,
    flagged: track.violations >= MAX_VIOLATIONS_BEFORE_FLAG,
  };
}

function resetTrack(userId) {
  tapHistory.delete(userId);
}

module.exports = {
  validateTap,
  resetTrack,
  MIN_TAP_INTERVAL_MS,
};
