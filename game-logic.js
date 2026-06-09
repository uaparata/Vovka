const UPGRADES = [
  { id: 'protein', basePrice: 50, priceMult: 1.6, maxLevel: 50, effect: (lvl) => ({ perTap: lvl }) },
  { id: 'gym', basePrice: 250, priceMult: 1.7, maxLevel: 30, effect: (lvl) => ({ perTap: lvl * 3 }) },
  { id: 'creatine', basePrice: 500, priceMult: 1.65, maxLevel: 25, effect: (lvl) => ({ perHour: lvl * 200 }) },
  { id: 'tshirt', basePrice: 1000, priceMult: 2, maxLevel: 10, effect: (lvl) => ({ tapMult: 1 + lvl * 0.5 }) },
  { id: 'earbuds', basePrice: 800, priceMult: 1.8, maxLevel: 20, effect: (lvl) => ({ maxEnergy: lvl * 12 }) },
  { id: 'ring', basePrice: 2000, priceMult: 2.2, maxLevel: 8, effect: (lvl) => ({ hourMult: 1 + lvl * 1.5 }) },
  { id: 'jacket', basePrice: 1500, priceMult: 2, maxLevel: 15, effect: (lvl) => ({ energyRegen: lvl * 0.1 }) },
];

const MAX_PASSIVE_ELAPSED_SEC = 4 * 3600;
const MAX_TAP_EARN_ESTIMATE = 500;
const BASE_MAX_ENERGY = 320;
const BASE_ENERGY_REGEN = 0.18;

const PHOTO_LEVELS = [
  { level: 1, min: 0, max: 10_000 },
  { level: 2, min: 10_000, max: 100_000 },
  { level: 3, min: 100_000, max: 500_000 },
  { level: 4, min: 500_000, max: 1_000_000 },
  { level: 5, min: 1_000_000, max: 2_500_000 },
  { level: 6, min: 2_500_000, max: 5_000_000 },
  { level: 7, min: 5_000_000, max: 10_000_000 },
  { level: 8, min: 10_000_000, max: 25_000_000 },
  { level: 9, min: 25_000_000, max: 50_000_000 },
  { level: 10, min: 50_000_000, max: 100_000_000 },
  { level: 11, min: 100_000_000, max: 250_000_000 },
  { level: 12, min: 250_000_000, max: 500_000_000 },
  { level: 13, min: 500_000_000, max: 1_000_000_000 },
  { level: 14, min: 1_000_000_000, max: 5_000_000_000 },
  { level: 15, min: 5_000_000_000, max: 50_000_000_000 },
  { level: 16, min: 50_000_000_000, max: 1_000_000_000_000 },
  { level: 17, min: 10_000_000_000_000, max: null },
];

function defaultSave() {
  return {
    balance: 0,
    energy: BASE_MAX_ENERGY,
    totalTaps: 0,
    totalEarned: 0,
    maxLevel: 1,
    peakBalance: 0,
    upgradeLevels: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])),
    lastSave: Date.now(),
    lastPassive: Date.now(),
    lastEnergyRegen: Date.now(),
  };
}

function calcStats(save) {
  let perTap = 1;
  let perHour = 0;
  let maxEnergy = BASE_MAX_ENERGY;
  let tapMult = 1;
  let hourMult = 1;
  let energyRegen = BASE_ENERGY_REGEN;

  for (const upgrade of UPGRADES) {
    const lvl = save.upgradeLevels[upgrade.id] || 0;
    if (lvl === 0) continue;
    const eff = upgrade.effect(lvl);
    if (eff.perTap) perTap += eff.perTap;
    if (eff.perHour) perHour += eff.perHour;
    if (eff.maxEnergy) maxEnergy += eff.maxEnergy;
    if (eff.tapMult) tapMult = eff.tapMult;
    if (eff.hourMult) hourMult = eff.hourMult;
    if (eff.energyRegen) energyRegen += eff.energyRegen;
  }

  return {
    perTap: Math.floor(perTap * tapMult),
    perHour: Math.floor(perHour * hourMult),
    maxEnergy,
    energyRegen,
  };
}

function getUpgradePrice(save, upgradeId) {
  const upgrade = UPGRADES.find((u) => u.id === upgradeId);
  if (!upgrade) return Infinity;
  const lvl = save.upgradeLevels[upgradeId] || 0;
  return Math.floor(upgrade.basePrice * Math.pow(upgrade.priceMult, lvl));
}

function levelFromBalance(balance) {
  let level = 1;
  for (const l of PHOTO_LEVELS) {
    if (balance >= l.min) level = l.level;
  }
  return level;
}

function syncMaxLevel(save) {
  const fromBalance = levelFromBalance(save.balance || 0);
  save.maxLevel = Math.max(save.maxLevel || 1, fromBalance);
}

function isFreshResetSave(save) {
  if (!save) return false;
  const upgradeSum = Object.values(save.upgradeLevels || {}).reduce(
    (sum, lvl) => sum + (Number(lvl) || 0),
    0
  );
  return (
    upgradeSum === 0 &&
    (save.totalTaps || 0) === 0 &&
    (save.totalEarned || 0) === 0 &&
    (save.balance || 0) === 0 &&
    (save.maxLevel || 1) <= 1
  );
}

function totalUpgradeSpend(upgradeLevels) {
  if (!upgradeLevels) return 0;
  let total = 0;
  for (const upgrade of UPGRADES) {
    const lvl = Math.min(upgrade.maxLevel, Math.max(0, Math.floor(upgradeLevels[upgrade.id] || 0)));
    for (let i = 0; i < lvl; i++) {
      total += Math.floor(upgrade.basePrice * Math.pow(upgrade.priceMult, i));
    }
  }
  return total;
}

function estimateMaxEarnedFromTaps(totalTaps) {
  const taps = Math.max(0, Math.floor(totalTaps || 0));
  return taps * MAX_TAP_EARN_ESTIMATE + 10_000;
}

function mergeUpgradeLevelsSafely(serverSave, incomingLevels) {
  const result = { ...serverSave.upgradeLevels };
  if (!incomingLevels || typeof incomingLevels !== 'object') return result;

  const budget = serverSave.totalEarned || 0;

  for (const upgrade of UPGRADES) {
    const incoming = Math.min(
      upgrade.maxLevel,
      Math.max(0, Math.floor(incomingLevels[upgrade.id] || 0))
    );
    const current = result[upgrade.id] || 0;
    const target = Math.max(current, incoming);
    const trial = { ...result, [upgrade.id]: target };
    if (totalUpgradeSpend(trial) <= budget) {
      result[upgrade.id] = target;
    }
  }
  return result;
}

function mergeUpgradeLevels(...levelObjs) {
  const result = Object.fromEntries(UPGRADES.map((u) => [u.id, 0]));
  for (const obj of levelObjs) {
    if (!obj) continue;
    for (const id of Object.keys(result)) {
      result[id] = Math.max(result[id], obj[id] || 0);
    }
  }
  return result;
}

function mergeSaves(...saves) {
  const valid = saves.filter(Boolean);
  if (!valid.length) return defaultSave();

  const resetSave = valid.find(isFreshResetSave);
  if (resetSave && valid.some((s) => !isFreshResetSave(s) && (s.totalEarned || 0) > 0)) {
    return { ...defaultSave(), ...resetSave };
  }

  const primary = valid.reduce((a, b) =>
    (a.totalEarned || 0) >= (b.totalEarned || 0) ? a : b
  );

  const merged = {
    balance: Math.max(...valid.map((s) => s.balance || 0)),
    energy: Math.max(...valid.map((s) => s.energy || 0), primary.energy || BASE_MAX_ENERGY),
    totalTaps: Math.max(...valid.map((s) => s.totalTaps || 0)),
    totalEarned: Math.max(...valid.map((s) => s.totalEarned || 0)),
    maxLevel: Math.max(...valid.map((s) => s.maxLevel || 1)),
    peakBalance: Math.max(
      ...valid.map((s) => s.peakBalance || 0),
      ...valid.map((s) => s.balance || 0)
    ),
    upgradeLevels: mergeUpgradeLevels(...valid.map((s) => s.upgradeLevels)),
    lastPassive: Math.max(...valid.map((s) => s.lastPassive || 0), Date.now()),
    lastEnergyRegen: Math.max(...valid.map((s) => s.lastEnergyRegen || 0), Date.now()),
    lastSave: Date.now(),
  };
  syncMaxLevel(merged);
  return merged;
}

function saveNeedsSync(cloud, merged) {
  if (!cloud) return true;
  return (
    (merged.totalEarned || 0) > (cloud.totalEarned || 0) ||
    (merged.balance || 0) > (cloud.balance || 0) ||
    (merged.totalTaps || 0) > (cloud.totalTaps || 0)
  );
}

function reconcileSaves(server, client) {
  const srv = server || defaultSave();
  if (!client) {
    const copy = { ...srv };
    syncMaxLevel(copy);
    return copy;
  }

  if (isFreshResetSave(srv)) {
    return { ...defaultSave(), ...srv };
  }

  const tapDelta = Math.max(0, Math.floor((client.totalTaps || 0) - (srv.totalTaps || 0)));
  const allowance = estimateMaxEarnedFromTaps(tapDelta);

  const sanitized = {
    balance: Math.min(
      Math.max(client.balance || 0, srv.balance || 0),
      (srv.balance || 0) + allowance
    ),
    totalEarned: Math.min(
      Math.max(client.totalEarned || 0, srv.totalEarned || 0),
      (srv.totalEarned || 0) + allowance
    ),
    totalTaps: Math.min(
      Math.max(client.totalTaps || 0, srv.totalTaps || 0),
      (srv.totalTaps || 0) + tapDelta + 30
    ),
    energy: Math.max(srv.energy || 0, client.energy || 0),
    upgradeLevels: client.upgradeLevels,
    lastPassive: Math.max(srv.lastPassive || 0, client.lastPassive || 0),
    lastEnergyRegen: Math.max(srv.lastEnergyRegen || 0, client.lastEnergyRegen || 0),
    maxLevel: Math.max(srv.maxLevel || 1, client.maxLevel || 1),
    peakBalance: Math.max(srv.peakBalance || 0, client.peakBalance || 0),
  };

  const merged = mergeSaves(srv, sanitized);
  merged.upgradeLevels = mergeUpgradeLevelsSafely(merged, sanitized.upgradeLevels);
  syncMaxLevel(merged);
  return merged;
}

function applyPassive(save, now = Date.now()) {
  const stats = calcStats(save);
  const elapsed = Math.min(
    Math.max(0, (now - save.lastPassive) / 1000),
    MAX_PASSIVE_ELAPSED_SEC
  );
  if (elapsed <= 0) return { earned: 0 };

  save.lastPassive = now;
  let earned = 0;
  if (stats.perHour > 0) {
    earned = (stats.perHour / 3600) * elapsed;
    save.balance += earned;
    save.totalEarned += earned;
  }
  const regen = stats.energyRegen * elapsed;
  save.energy = Math.min(stats.maxEnergy, save.energy + regen);
  if (save.energy > stats.maxEnergy) save.energy = stats.maxEnergy;
  syncMaxLevel(save);
  save.lastSave = now;
  return { earned };
}

function applyTap(save) {
  const stats = calcStats(save);
  if (save.energy < 1) return { ok: false, reason: 'no_energy' };

  save.energy -= 1;
  const earned = stats.perTap;
  save.balance += earned;
  save.totalTaps += 1;
  save.totalEarned += earned;
  syncMaxLevel(save);
  save.lastSave = Date.now();
  return { ok: true, earned, stats };
}

function applyBuyUpgrade(save, upgradeId) {
  const upgrade = UPGRADES.find((u) => u.id === upgradeId);
  if (!upgrade) return { ok: false, reason: 'invalid_upgrade' };

  const lvl = save.upgradeLevels[upgradeId] || 0;
  if (lvl >= upgrade.maxLevel) return { ok: false, reason: 'maxed' };

  const price = getUpgradePrice(save, upgradeId);
  if (save.balance < price) return { ok: false, reason: 'no_money' };

  save.balance -= price;
  save.upgradeLevels[upgradeId] = lvl + 1;
  syncMaxLevel(save);
  save.lastSave = Date.now();
  return { ok: true, price };
}

module.exports = {
  UPGRADES,
  PHOTO_LEVELS,
  defaultSave,
  calcStats,
  getUpgradePrice,
  levelFromBalance,
  syncMaxLevel,
  isFreshResetSave,
  totalUpgradeSpend,
  estimateMaxEarnedFromTaps,
  mergeUpgradeLevelsSafely,
  mergeSaves,
  reconcileSaves,
  saveNeedsSync,
  applyPassive,
  applyTap,
  applyBuyUpgrade,
};
