function proteinTapBonus(lvl) {
  return Math.floor((lvl * (lvl + 1)) / 2);
}

function gymTapBonus(lvl) {
  return proteinTapBonus(lvl) * 3;
}

const UPGRADES = [
  {
    id: 'protein',
    basePrice: 50,
    priceMult: 1.68,
    maxLevel: 50,
    effect: (lvl) => ({ perTap: proteinTapBonus(lvl) }),
  },
  {
    id: 'gym',
    basePrice: 250,
    priceMult: 1.72,
    maxLevel: 30,
    effect: (lvl) => ({ perTap: gymTapBonus(lvl) }),
  },
  { id: 'tshirt', basePrice: 1000, priceMult: 2, maxLevel: 10, effect: (lvl) => ({ tapMult: 1 + lvl * 0.5 }) },
  { id: 'earbuds', basePrice: 800, priceMult: 1.8, maxLevel: 20, effect: (lvl) => ({ maxEnergy: lvl * 12 }) },
  { id: 'jacket', basePrice: 1500, priceMult: 2, maxLevel: 15, effect: (lvl) => ({ energyRegen: lvl * 0.1 }) },
];

const MAX_POKEMON_SLOTS = 4;
const POKEMON_SLOT_PRICES = [0, 100_000, 1_000_000, 10_000_000];

const POKEMONS = [
  {
    id: 'kirill',
    name: 'Mullin',
    image: 'assets/pokemon/kirill-idle.png',
    spriteSheet: 'assets/pokemon/kirill-sheet.png',
    spriteFrames: 6,
    animMs: 540,
    animClass: 'play-uppercut',
    fillsSlot: true,
    price: 10_000,
    upgradeBasePrice: 25_000,
    upgradePriceAtMax: 100_000_000_000,
    maxLevel: 100,
    perHourAtMax: 500_000_000,
    perHourCurve: 'cubic',
    punchIntervalMs: 2500,
    weapon: 'fists',
    desc: 'Апперкот + прыжок — зинкоины за каждый удар',
  },
  {
    id: 'bitcoin',
    name: 'BITCOIN',
    image: 'assets/pokemon/bitcoin-idle.png',
    spriteSheet: 'assets/pokemon/bitcoin-sheet.png',
    spriteFrames: 6,
    animMs: 620,
    animClass: 'play-lightsaber',
    fillsSlot: true,
    price: 50_000,
    upgradeBasePrice: 35_000,
    upgradePriceAtMax: 80_000_000_000,
    maxLevel: 100,
    perHourAtMax: 400_000_000,
    perHourCurve: 'cubic',
    punchIntervalMs: 2200,
    weapon: 'lightsaber',
    desc: 'B.T.S. — машет синим световым мечом',
  },
];

function getPokemonPerHour(pokemon, level) {
  if (!pokemon || level <= 0) return 0;
  const max = pokemon.maxLevel || 1;
  if (pokemon.perHourAtMax) {
    const t = level / max;
    if (pokemon.perHourCurve === 'cubic') {
      return Math.floor(pokemon.perHourAtMax * t * t * t);
    }
    return Math.floor(pokemon.perHourAtMax * t);
  }
  return Math.floor((pokemon.perHourBase || 0) * level);
}

function getPokemonUpgradePrice(pokemon, level) {
  if (!pokemon || level <= 0 || level >= pokemon.maxLevel) return Infinity;
  if (pokemon.upgradePriceAtMax && pokemon.maxLevel > 1) {
    const base = pokemon.upgradeBasePrice;
    const max = pokemon.upgradePriceAtMax;
    const steps = pokemon.maxLevel - 1;
    const t = (steps - level) / steps;
    return Math.floor(max * Math.pow(base / max, t));
  }
  return Math.floor(pokemon.upgradeBasePrice * Math.pow(pokemon.upgradePriceMult, level - 1));
}

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

function defaultPokemonDeployed() {
  return [null, null, null, null];
}

function defaultSave() {
  return {
    balance: 0,
    energy: BASE_MAX_ENERGY,
    totalTaps: 0,
    totalEarned: 0,
    maxLevel: 1,
    peakBalance: 0,
    upgradeLevels: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])),
    ownedPokemon: {},
    pokemonDeployed: defaultPokemonDeployed(),
    pokemonMeta: {},
    pokemonFarmBuffer: {},
    pokemonSlotsUnlocked: 1,
    lastSave: Date.now(),
    lastPassive: Date.now(),
    lastEnergyRegen: Date.now(),
  };
}

function countOwnedPokemon(ownedPokemon) {
  return Object.values(ownedPokemon || {}).filter((lvl) => (lvl || 0) > 0).length;
}

function getUnlockedSlotCount(save) {
  const n = save?.pokemonSlotsUnlocked ?? 1;
  return Math.min(Math.max(1, n), MAX_POKEMON_SLOTS);
}

function getPokemonSlotPrice(slotIndex) {
  return POKEMON_SLOT_PRICES[slotIndex] ?? Infinity;
}

function normalizePokemonSlots(save) {
  const unlocked = getUnlockedSlotCount(save);
  if (unlocked > MAX_POKEMON_SLOTS) {
    save.pokemonSlotsUnlocked = MAX_POKEMON_SLOTS;
  }
}

function normalizePokemonDeployed(save) {
  if (!Array.isArray(save.pokemonDeployed)) {
    save.pokemonDeployed = defaultPokemonDeployed();
  }
  while (save.pokemonDeployed.length < MAX_POKEMON_SLOTS) {
    save.pokemonDeployed.push(null);
  }
  save.pokemonDeployed = save.pokemonDeployed.slice(0, MAX_POKEMON_SLOTS);

  const owned = save.ownedPokemon || {};
  const seen = new Set();
  save.pokemonDeployed = save.pokemonDeployed.map((id) => {
    if (!id || (owned[id] || 0) <= 0 || seen.has(id)) return null;
    seen.add(id);
    return id;
  });

  const unlocked = getUnlockedSlotCount(save);
  for (const pokemon of POKEMONS) {
    if ((owned[pokemon.id] || 0) <= 0 || seen.has(pokemon.id)) continue;
    for (let i = 0; i < unlocked; i += 1) {
      if (!save.pokemonDeployed[i]) {
        save.pokemonDeployed[i] = pokemon.id;
        seen.add(pokemon.id);
        break;
      }
    }
  }
}

function isPokemonDeployed(save, pokemonId) {
  return (save.pokemonDeployed || []).includes(pokemonId);
}

function countDeployedPokemon(save) {
  const owned = save.ownedPokemon || {};
  const unlocked = getUnlockedSlotCount(save);
  return (save.pokemonDeployed || [])
    .slice(0, unlocked)
    .filter((id) => id && (owned[id] || 0) > 0).length;
}

function findDeploySlot(save, pokemonId) {
  const unlocked = getUnlockedSlotCount(save);
  return (save.pokemonDeployed || []).slice(0, unlocked).indexOf(pokemonId);
}

function applySetPokemonDeploy(save, pokemonId, deploy) {
  const pokemon = POKEMONS.find((p) => p.id === pokemonId);
  if (!pokemon) return { ok: false, reason: 'invalid_pokemon' };

  const owned = save.ownedPokemon || {};
  if ((owned[pokemonId] || 0) <= 0) return { ok: false, reason: 'not_owned' };

  if (!save.pokemonDeployed) save.pokemonDeployed = defaultPokemonDeployed();
  normalizePokemonDeployed(save);

  const slot = findDeploySlot(save, pokemonId);
  if (deploy) {
    if (slot >= 0) return { ok: true, deployed: true, slot };
    const unlocked = getUnlockedSlotCount(save);
    const free = save.pokemonDeployed.slice(0, unlocked).findIndex((id) => !id);
    if (free < 0) return { ok: false, reason: 'farm_full' };
    save.pokemonDeployed[free] = pokemonId;
    if (!save.pokemonMeta) save.pokemonMeta = {};
    save.pokemonMeta[`lastPunch_${pokemonId}`] = Date.now();
    save.lastSave = Date.now();
    return { ok: true, deployed: true, slot: free };
  }

  if (slot < 0) return { ok: true, deployed: false };
  save.pokemonDeployed[slot] = null;
  save.lastSave = Date.now();
  return { ok: true, deployed: false, slot };
}

function calcPokemonStats(save) {
  const owned = save.ownedPokemon || {};
  normalizePokemonDeployed(save);
  const deployed = new Set(
    (save.pokemonDeployed || []).filter((id) => id && (owned[id] || 0) > 0)
  );
  let perHour = 0;
  let count = 0;
  const active = [];

  for (const pokemon of POKEMONS) {
    const lvl = owned[pokemon.id] || 0;
    if (lvl <= 0) continue;
    if (!deployed.has(pokemon.id)) continue;
    count += 1;
    const ph = getPokemonPerHour(pokemon, lvl);
    perHour += ph;
    active.push({
      id: pokemon.id,
      level: lvl,
      perHour: ph,
      punchIntervalMs: pokemon.punchIntervalMs,
      coinsPerPunch: (ph * pokemon.punchIntervalMs) / 3_600_000,
    });
  }

  return { perHour, count, active };
}

function calcStats(save) {
  let perTap = 1;
  let maxEnergy = BASE_MAX_ENERGY;
  let tapMult = 1;
  let energyRegen = BASE_ENERGY_REGEN;

  for (const upgrade of UPGRADES) {
    const lvl = save.upgradeLevels[upgrade.id] || 0;
    if (lvl === 0) continue;
    const eff = upgrade.effect(lvl);
    if (eff.perTap) perTap += eff.perTap;
    if (eff.maxEnergy) maxEnergy += eff.maxEnergy;
    if (eff.tapMult) tapMult = eff.tapMult;
    if (eff.energyRegen) energyRegen += eff.energyRegen;
  }

  const pokemonStats = calcPokemonStats(save);

  return {
    perTap: Math.floor(perTap * tapMult),
    perHour: Math.floor(pokemonStats.perHour),
    maxEnergy,
    energyRegen,
    pokemonCount: pokemonStats.count,
    pokemonActive: pokemonStats.active,
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
  const pokemonSum = Object.values(save.ownedPokemon || {}).reduce(
    (sum, lvl) => sum + (Number(lvl) || 0),
    0
  );
  return (
    upgradeSum === 0 &&
    pokemonSum === 0 &&
    (save.totalTaps || 0) === 0 &&
    (save.totalEarned || 0) === 0 &&
    (save.balance || 0) === 0
  );
}

function mergeOwnedPokemon(...objs) {
  const result = {};
  for (const obj of objs) {
    if (!obj) continue;
    for (const [id, lvl] of Object.entries(obj)) {
      result[id] = Math.max(result[id] || 0, lvl || 0);
    }
  }
  return result;
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

function mergePokemonDeployed(...lists) {
  const result = defaultPokemonDeployed();
  const seen = new Set();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (let i = 0; i < MAX_POKEMON_SLOTS; i += 1) {
      const id = list[i];
      if (!id || seen.has(id)) continue;
      const free = result.findIndex((slot) => !slot);
      if (free < 0) break;
      result[free] = id;
      seen.add(id);
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
    ownedPokemon: mergeOwnedPokemon(...valid.map((s) => s.ownedPokemon)),
    pokemonDeployed: mergePokemonDeployed(...valid.map((s) => s.pokemonDeployed)),
    pokemonMeta: valid.reduce((a, b) => ({ ...a, ...(b.pokemonMeta || {}) }), {}),
    pokemonFarmBuffer: valid.reduce((a, b) => ({ ...a, ...(b.pokemonFarmBuffer || {}) }), {}),
    pokemonSlotsUnlocked: Math.max(...valid.map((s) => getUnlockedSlotCount(s))),
    lastPassive: Math.max(...valid.map((s) => s.lastPassive || 0), Date.now()),
    lastEnergyRegen: Math.max(...valid.map((s) => s.lastEnergyRegen || 0), Date.now()),
    lastSave: Date.now(),
  };
  normalizePokemonDeployed(merged);
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
    ownedPokemon: mergeOwnedPokemon(srv.ownedPokemon, client.ownedPokemon),
    pokemonDeployed: mergePokemonDeployed(srv.pokemonDeployed, client.pokemonDeployed),
    pokemonMeta: { ...(srv.pokemonMeta || {}), ...(client.pokemonMeta || {}) },
    pokemonFarmBuffer: { ...(srv.pokemonFarmBuffer || {}), ...(client.pokemonFarmBuffer || {}) },
    pokemonSlotsUnlocked: Math.max(getUnlockedSlotCount(srv), getUnlockedSlotCount(client)),
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

function applyPokemonPunches(save, now = Date.now()) {
  const { active } = calcPokemonStats(save);
  if (!active.length) return { earned: 0, punchEvents: [] };

  if (!save.pokemonMeta) save.pokemonMeta = {};
  if (!save.pokemonFarmBuffer) save.pokemonFarmBuffer = {};

  const maxElapsedMs = MAX_PASSIVE_ELAPSED_SEC * 1000;
  let totalEarned = 0;
  const punchEvents = [];

  for (const p of active) {
    const def = POKEMONS.find((x) => x.id === p.id);
    if (!def) continue;

    const key = `lastPunch_${p.id}`;
    const last = save.pokemonMeta[key] || save.lastPassive || now;
    const elapsed = Math.min(Math.max(0, now - last), maxElapsedMs);
    const punches = Math.floor(elapsed / def.punchIntervalMs);
    if (punches <= 0) continue;

    const coinsPerPunch = (p.perHour * def.punchIntervalMs) / 3_600_000;
    save.pokemonFarmBuffer[p.id] = (save.pokemonFarmBuffer[p.id] || 0) + punches * coinsPerPunch;
    const whole = Math.floor(save.pokemonFarmBuffer[p.id]);
    if (whole > 0) {
      save.pokemonFarmBuffer[p.id] -= whole;
      totalEarned += whole;
      punchEvents.push({ id: p.id, count: punches, earned: whole });
    }
    save.pokemonMeta[key] = last + punches * def.punchIntervalMs;
  }

  if (totalEarned > 0) {
    save.balance += totalEarned;
    save.totalEarned += totalEarned;
    syncMaxLevel(save);
  }

  return { earned: totalEarned, punchEvents };
}

function applyPassive(save, now = Date.now()) {
  const stats = calcStats(save);
  const elapsed = Math.min(
    Math.max(0, (now - save.lastPassive) / 1000),
    MAX_PASSIVE_ELAPSED_SEC
  );
  if (elapsed <= 0) return { earned: 0, punchEvents: [] };

  save.lastPassive = now;
  const { earned, punchEvents } = applyPokemonPunches(save, now);
  const regen = stats.energyRegen * elapsed;
  save.energy = Math.min(stats.maxEnergy, save.energy + regen);
  if (save.energy > stats.maxEnergy) save.energy = stats.maxEnergy;
  save.lastSave = now;
  return { earned, punchEvents };
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

function applyUpgradePokemon(save, pokemonId) {
  const pokemon = POKEMONS.find((p) => p.id === pokemonId);
  if (!pokemon) return { ok: false, reason: 'invalid_pokemon' };

  if (!save.ownedPokemon) save.ownedPokemon = {};
  const lvl = save.ownedPokemon[pokemonId] || 0;
  if (lvl <= 0) return { ok: false, reason: 'not_owned' };
  if (lvl >= pokemon.maxLevel) return { ok: false, reason: 'maxed' };

  const price = getPokemonUpgradePrice(pokemon, lvl);
  if (save.balance < price) return { ok: false, reason: 'no_money' };

  save.balance -= price;
  save.ownedPokemon[pokemonId] = lvl + 1;
  syncMaxLevel(save);
  save.lastSave = Date.now();
  return { ok: true, price, level: lvl + 1 };
}

function applyBuyPokemon(save, pokemonId) {
  const pokemon = POKEMONS.find((p) => p.id === pokemonId);
  if (!pokemon) return { ok: false, reason: 'invalid_pokemon' };

  if (!save.ownedPokemon) save.ownedPokemon = {};
  if ((save.ownedPokemon[pokemonId] || 0) > 0) {
    return { ok: false, reason: 'already_owned' };
  }
  if (save.balance < pokemon.price) return { ok: false, reason: 'no_money' };

  save.balance -= pokemon.price;
  save.ownedPokemon[pokemonId] = 1;
  if (!save.pokemonDeployed) save.pokemonDeployed = defaultPokemonDeployed();
  normalizePokemonDeployed(save);
  applySetPokemonDeploy(save, pokemonId, true);
  if (!save.pokemonMeta) save.pokemonMeta = {};
  save.pokemonMeta[`lastPunch_${pokemonId}`] = Date.now();
  syncMaxLevel(save);
  save.lastSave = Date.now();
  return { ok: true, price: pokemon.price };
}

function applyBuyPokemonSlot(save, slotIndex) {
  const index = Number(slotIndex);
  if (!Number.isInteger(index) || index < 1 || index >= MAX_POKEMON_SLOTS) {
    return { ok: false, reason: 'invalid_slot' };
  }

  const unlocked = getUnlockedSlotCount(save);
  if (index !== unlocked) {
    return { ok: false, reason: 'wrong_slot_order' };
  }

  const price = getPokemonSlotPrice(index);
  if (save.balance < price) return { ok: false, reason: 'no_money' };

  save.balance -= price;
  save.pokemonSlotsUnlocked = unlocked + 1;
  syncMaxLevel(save);
  save.lastSave = Date.now();
  return { ok: true, price, slotIndex: index };
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
  POKEMONS,
  MAX_POKEMON_SLOTS,
  POKEMON_SLOT_PRICES,
  PHOTO_LEVELS,
  defaultSave,
  calcStats,
  calcPokemonStats,
  getUpgradePrice,
  getPokemonPerHour,
  getPokemonUpgradePrice,
  levelFromBalance,
  syncMaxLevel,
  isFreshResetSave,
  totalUpgradeSpend,
  estimateMaxEarnedFromTaps,
  mergeUpgradeLevelsSafely,
  mergeOwnedPokemon,
  mergeSaves,
  reconcileSaves,
  saveNeedsSync,
  applyPassive,
  applyPokemonPunches,
  applyTap,
  applyBuyUpgrade,
  applyBuyPokemon,
  applyBuyPokemonSlot,
  applyUpgradePokemon,
  applySetPokemonDeploy,
  countOwnedPokemon,
  countDeployedPokemon,
  getUnlockedSlotCount,
  getPokemonSlotPrice,
  normalizePokemonSlots,
  normalizePokemonDeployed,
  isPokemonDeployed,
  defaultPokemonDeployed,
};
