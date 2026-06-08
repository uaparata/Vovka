const UPGRADES = [
  { id: 'protein', basePrice: 50, priceMult: 1.6, maxLevel: 50, effect: (lvl) => ({ perTap: lvl }) },
  { id: 'gym', basePrice: 250, priceMult: 1.7, maxLevel: 30, effect: (lvl) => ({ perTap: lvl * 3 }) },
  { id: 'creatine', basePrice: 500, priceMult: 1.65, maxLevel: 25, effect: (lvl) => ({ perHour: lvl * 10 }) },
  { id: 'tshirt', basePrice: 1000, priceMult: 2, maxLevel: 10, effect: (lvl) => ({ tapMult: 1 + lvl * 0.5 }) },
  { id: 'earbuds', basePrice: 800, priceMult: 1.8, maxLevel: 20, effect: (lvl) => ({ maxEnergy: lvl * 50 }) },
  { id: 'ring', basePrice: 2000, priceMult: 2.2, maxLevel: 8, effect: (lvl) => ({ hourMult: 1 + lvl }) },
  { id: 'jacket', basePrice: 1500, priceMult: 2, maxLevel: 15, effect: (lvl) => ({ energyRegen: lvl }) },
];

const PHOTO_LEVELS = [
  { level: 1, min: 0, max: 10_000 },
  { level: 2, min: 10_000, max: 100_000 },
  { level: 3, min: 100_000, max: 500_000 },
  { level: 4, min: 500_000, max: 1_000_000 },
  { level: 5, min: 1_000_000, max: 5_000_000 },
];

function defaultSave() {
  return {
    balance: 0,
    energy: 1000,
    totalTaps: 0,
    totalEarned: 0,
    maxLevel: 1,
    peakBalance: 0,
    upgradeLevels: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])),
    lastSave: Date.now(),
    lastPassive: Date.now(),
  };
}

function calcStats(save) {
  let perTap = 1;
  let perHour = 0;
  let maxEnergy = 1000;
  let tapMult = 1;
  let hourMult = 1;
  let energyRegen = 1;

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
  save.peakBalance = Math.max(save.peakBalance || 0, save.balance, save.totalEarned);
  save.maxLevel = Math.max(save.maxLevel || 1, levelFromBalance(save.peakBalance));
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

  const primary = valid.reduce((a, b) =>
    (a.totalEarned || 0) >= (b.totalEarned || 0) ? a : b
  );

  const merged = {
    balance: Math.max(...valid.map((s) => s.balance || 0)),
    energy: Math.max(...valid.map((s) => s.energy || 0), primary.energy || 1000),
    totalTaps: Math.max(...valid.map((s) => s.totalTaps || 0)),
    totalEarned: Math.max(...valid.map((s) => s.totalEarned || 0)),
    maxLevel: Math.max(...valid.map((s) => s.maxLevel || 1)),
    peakBalance: Math.max(
      ...valid.map((s) => s.peakBalance || 0),
      ...valid.map((s) => s.balance || 0)
    ),
    upgradeLevels: mergeUpgradeLevels(...valid.map((s) => s.upgradeLevels)),
    lastPassive: Math.max(...valid.map((s) => s.lastPassive || 0), Date.now()),
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

function applyPassive(save, now = Date.now()) {
  const stats = calcStats(save);
  const elapsed = (now - save.lastPassive) / 1000;
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
  syncMaxLevel,
  mergeSaves,
  saveNeedsSync,
  applyPassive,
  applyTap,
  applyBuyUpgrade,
};
