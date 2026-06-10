const STORAGE_GUEST = 'fauckzini_save_guest';
const STORAGE_LEGACY = 'fauckzini_save';
const LAST_USER_KEY = 'fauckzini_last_user_id';
const SILENT_AUTH_TRIED = 'fauckzini_silent_auth_tried';

function storageKey(userId) {
  return userId ? `fauckzini_save_u_${userId}` : STORAGE_GUEST;
}

function rememberUser(user) {
  if (user?.id != null) {
    localStorage.setItem(LAST_USER_KEY, String(user.id));
    if (user.avatar) {
      localStorage.setItem(`fauckzini_avatar_u_${user.id}`, user.avatar);
    }
  }
}

function getCachedAvatar(userId) {
  if (!userId) return null;
  return localStorage.getItem(`fauckzini_avatar_u_${userId}`);
}

function getLastUserId() {
  const raw = localStorage.getItem(LAST_USER_KEY);
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

const PHOTO_LEVELS = [
  { level: 1, min: 0, max: 10_000, image: 'assets/level-1.png', name: 'Новичок' },
  { level: 2, min: 10_000, max: 100_000, image: 'assets/level-2.png', name: 'Уличный' },
  { level: 3, min: 100_000, max: 500_000, image: 'assets/level-3.png', name: 'Стиляга' },
  { level: 4, min: 500_000, max: 1_000_000, image: 'assets/level-4.png', name: 'Босс' },
  { level: 5, min: 1_000_000, max: 2_500_000, image: 'assets/level-5.png', name: 'Спрайт-рок' },
  { level: 6, min: 2_500_000, max: 5_000_000, image: 'assets/level-6.png', name: 'Шашлычник' },
  { level: 7, min: 5_000_000, max: 10_000_000, image: 'assets/level-7.png', name: 'Голливуд' },
  { level: 8, min: 10_000_000, max: 25_000_000, image: 'assets/level-8.png', name: 'На полу' },
  { level: 9, min: 25_000_000, max: 50_000_000, image: 'assets/level-9.png', name: 'Улыбка' },
  { level: 10, min: 50_000_000, max: 100_000_000, image: 'assets/level-10.png', name: 'Модник' },
  { level: 11, min: 100_000_000, max: 250_000_000, image: 'assets/level-11.png', name: 'Доктор' },
  { level: 12, min: 250_000_000, max: 500_000_000, image: 'assets/level-12.png', name: 'Квартирник' },
  { level: 13, min: 500_000_000, max: 1_000_000_000, image: 'assets/level-13.png', name: 'Селфи-зум' },
  { level: 14, min: 1_000_000_000, max: 5_000_000_000, image: 'assets/level-14.png', name: 'Виски Bape' },
  { level: 15, min: 5_000_000_000, max: 50_000_000_000, image: 'assets/level-15.png', name: 'Дрыхнет' },
  { level: 16, min: 50_000_000_000, max: 1_000_000_000_000, image: 'assets/level-16.png', name: 'Supreme' },
  { level: 17, min: 10_000_000_000_000, max: null, image: 'assets/level-17.png', name: 'Легенда' },
];

let lastPhotoLevel = 0;
let currentPhotoSrc = '';

function proteinTapBonus(lvl) {
  return Math.floor((lvl * (lvl + 1)) / 2);
}

function gymTapBonus(lvl) {
  return proteinTapBonus(lvl) * 3;
}

const UPGRADES = [
  {
    id: 'protein',
    name: 'Протеин',
    icon: '🥤',
    desc: 'Растёт с уровнем: чем выше ур., тем больше за тап',
    basePrice: 50,
    priceMult: 1.68,
    maxLevel: 50,
    effect: (lvl) => ({ perTap: proteinTapBonus(lvl) }),
  },
  {
    id: 'gym',
    name: 'Абонемент в зал',
    icon: '🏋️',
    desc: '×3 к бонусу протеина за тап',
    basePrice: 250,
    priceMult: 1.72,
    maxLevel: 30,
    effect: (lvl) => ({ perTap: gymTapBonus(lvl) }),
  },
  {
    id: 'tshirt',
    name: 'Футболка LOSING MY MIND',
    icon: '👕',
    desc: '×1.5 к доходу за тап',
    basePrice: 1000,
    priceMult: 2,
    maxLevel: 10,
    effect: (lvl) => ({ tapMult: 1 + lvl * 0.5 }),
  },
  {
    id: 'earbuds',
    name: 'Наушники',
    icon: '🎧',
    desc: '+12 к макс. энергии',
    basePrice: 800,
    priceMult: 1.8,
    maxLevel: 20,
    effect: (lvl) => ({ maxEnergy: lvl * 12 }),
  },
  {
    id: 'jacket',
    name: 'Куртка на плече',
    icon: '🧥',
    desc: 'Больше энергии за одно восстановление',
    basePrice: 1500,
    priceMult: 2,
    maxLevel: 15,
    effect: (lvl) => ({ energyRegen: lvl * 0.1 }),
  },
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
    animMs: 720,
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
  {
    id: 'nikita',
    name: 'Nikita',
    image: 'assets/pokemon/nikita-idle.png',
    spriteSheet: 'assets/pokemon/nikita-sheet.png',
    spriteFrames: 7,
    animMs: 770,
    animClass: 'play-punch-break',
    fillsSlot: true,
    price: 80_000,
    upgradeBasePrice: 30_000,
    upgradePriceAtMax: 90_000_000_000,
    maxLevel: 100,
    perHourAtMax: 450_000_000,
    perHourCurve: 'cubic',
    punchIntervalMs: 2800,
    weapon: 'fists',
    desc: 'Бьёт экран — зинкоины за каждый удар',
  },
];

const POKEMON_ANIM_CLASSES = [...new Set(POKEMONS.map((p) => p.animClass).filter(Boolean))];

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

let pokemonFarmRenderKey = '';

const defaultPokemonDeployed = () => [null, null, null, null];

const defaultState = () => ({
  balance: 0,
  energy: 320,
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
});

let pokemonVisualTimers = {};
let shopActionBusy = false;

let state = defaultState();
let currentUser = null;
let isAdmin = false;
const tapQueue = [];
let tapQueueRunning = false;
let leaderboardPollTimer = null;
let sessionRecoveryInProgress = false;

function loadLocalState(userId = null) {
  const keys = userId
    ? [storageKey(userId)]
    : [STORAGE_GUEST, STORAGE_LEGACY];

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const saved = JSON.parse(raw);
      const loaded = { ...defaultState(), ...saved };
      normalizePokemonSlots(loaded);
      normalizePokemonDeployed(loaded);
      loaded.maxLevel = Math.max(
        loaded.maxLevel || 1,
        levelFromBalance(loaded.balance || 0)
      );
      return loaded;
    } catch (_) {}
  }
  return defaultState();
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

function countOwnedPokemon(ownedPokemon) {
  return Object.values(ownedPokemon || {}).filter((lvl) => (lvl || 0) > 0).length;
}

function getUnlockedSlotCount(save = state) {
  const n = save?.pokemonSlotsUnlocked ?? 1;
  return Math.min(Math.max(1, n), MAX_POKEMON_SLOTS);
}

function getPokemonSlotPrice(slotIndex) {
  return POKEMON_SLOT_PRICES[slotIndex] ?? Infinity;
}

function hasEmptyDeploySlot(save = state) {
  const unlocked = getUnlockedSlotCount(save);
  return (save.pokemonDeployed || []).slice(0, unlocked).some((id) => !id);
}

function normalizePokemonSlots(save) {
  if (getUnlockedSlotCount(save) > MAX_POKEMON_SLOTS) {
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

function isPokemonDeployed(pokemonId, save = state) {
  return (save.pokemonDeployed || []).includes(pokemonId);
}

function calcPokemonStats() {
  const owned = state.ownedPokemon || {};
  normalizePokemonDeployed(state);
  const deployed = new Set(
    (state.pokemonDeployed || []).filter((id) => id && (owned[id] || 0) > 0)
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
    });
  }

  return { perHour, count, active };
}

function clearStaleLocalSaves(userId) {
  localStorage.removeItem(storageKey(userId));
  localStorage.removeItem(STORAGE_GUEST);
  localStorage.removeItem(STORAGE_LEGACY);
}

function savesWithProgress(saves) {
  const meaningful = saves.filter((s) => s && !isFreshResetSave(s));
  return meaningful.length ? meaningful : saves.filter(Boolean);
}

function mergeSaveStates(...saves) {
  const valid = savesWithProgress(saves);
  if (!valid.length) return defaultState();

  const primary = valid.reduce((a, b) =>
    (a.totalEarned || 0) >= (b.totalEarned || 0) ? a : b
  );

  const upgradeLevels = { ...defaultState().upgradeLevels };
  for (const s of valid) {
    for (const [id, lvl] of Object.entries(s.upgradeLevels || {})) {
      upgradeLevels[id] = Math.max(upgradeLevels[id] || 0, lvl || 0);
    }
  }

  const ownedPokemon = {};
  for (const s of valid) {
    for (const [id, lvl] of Object.entries(s.ownedPokemon || {})) {
      ownedPokemon[id] = Math.max(ownedPokemon[id] || 0, lvl || 0);
    }
  }

  const merged = {
    ...defaultState(),
    balance: Math.max(...valid.map((s) => s.balance || 0)),
    energy: Math.max(...valid.map((s) => s.energy || 0), primary.energy || 320),
    totalTaps: Math.max(...valid.map((s) => s.totalTaps || 0)),
    totalEarned: Math.max(...valid.map((s) => s.totalEarned || 0)),
    maxLevel: Math.max(...valid.map((s) => s.maxLevel || 1)),
    peakBalance: Math.max(
      ...valid.map((s) => s.peakBalance || 0),
      ...valid.map((s) => s.balance || 0)
    ),
    upgradeLevels,
    ownedPokemon,
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

function mergePokemonDeployed(...lists) {
  const result = defaultPokemonDeployed();
  const seen = new Set();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const id of list) {
      if (!id || seen.has(id)) continue;
      const free = result.findIndex((slot) => !slot);
      if (free < 0) break;
      result[free] = id;
      seen.add(id);
    }
  }
  return result;
}

function saveNeedsSync(cloud, merged) {
  if (!cloud) return true;
  return (
    (merged.totalEarned || 0) > (cloud.totalEarned || 0) ||
    (merged.balance || 0) > (cloud.balance || 0) ||
    (merged.totalTaps || 0) > (cloud.totalTaps || 0)
  );
}

function getSavePayload() {
  return {
    balance: state.balance,
    energy: state.energy,
    totalTaps: state.totalTaps,
    totalEarned: state.totalEarned,
    maxLevel: state.maxLevel,
    peakBalance: state.peakBalance,
    upgradeLevels: state.upgradeLevels,
    ownedPokemon: state.ownedPokemon,
    pokemonDeployed: state.pokemonDeployed,
    pokemonMeta: state.pokemonMeta,
    pokemonFarmBuffer: state.pokemonFarmBuffer,
    pokemonSlotsUnlocked: state.pokemonSlotsUnlocked,
    lastPassive: state.lastPassive,
    lastEnergyRegen: state.lastEnergyRegen,
    lastSave: state.lastSave,
  };
}

function applySaveData(data, options = {}) {
  const { authoritative = false } = options;
  const base = defaultState();
  const prevMaxLevel = state.maxLevel || 1;
  const prevBalance = state.balance || 0;
  const prevEarned = state.totalEarned || 0;
  const incomingBalance = data.balance ?? 0;
  const incomingEarned = data.totalEarned ?? 0;
  state = {
    ...base,
    balance: authoritative ? incomingBalance : Math.max(incomingBalance, prevBalance),
    totalEarned: authoritative ? incomingEarned : Math.max(incomingEarned, prevEarned),
    energy: data.energy ?? 320,
    totalTaps: data.totalTaps ?? 0,
    maxLevel: Math.max(data.maxLevel ?? 1, prevMaxLevel),
    peakBalance: Math.max(data.peakBalance ?? 0, state.peakBalance ?? 0),
    upgradeLevels: isFreshResetSave(data)
      ? { ...base.upgradeLevels }
      : { ...base.upgradeLevels, ...(data.upgradeLevels || {}) },
    ownedPokemon: isFreshResetSave(data)
      ? { ...base.ownedPokemon }
      : { ...base.ownedPokemon, ...(data.ownedPokemon || {}) },
    pokemonDeployed: isFreshResetSave(data)
      ? defaultPokemonDeployed()
      : mergePokemonDeployed(data.pokemonDeployed),
    pokemonMeta: isFreshResetSave(data)
      ? { ...base.pokemonMeta }
      : { ...base.pokemonMeta, ...(data.pokemonMeta || {}) },
    pokemonFarmBuffer: isFreshResetSave(data)
      ? { ...base.pokemonFarmBuffer }
      : { ...base.pokemonFarmBuffer, ...(data.pokemonFarmBuffer || {}) },
    pokemonSlotsUnlocked: isFreshResetSave(data)
      ? base.pokemonSlotsUnlocked
      : getUnlockedSlotCount(data),
    lastPassive: data.lastPassive ?? Date.now(),
    lastEnergyRegen: data.lastEnergyRegen ?? data.lastPassive ?? Date.now(),
    lastSave: data.lastSave ?? Date.now(),
  };
  normalizePokemonSlots(state);
  normalizePokemonDeployed(state);
  if (!isFreshResetSave(data)) syncMaxLevel();
}

let googleAuthReady = true;

function setSyncStatus(_status) {}

function saveState() {
  state.lastSave = Date.now();
  const userId = currentUser?.id ?? getLastUserId();
  const key = userId ? storageKey(userId) : STORAGE_GUEST;
  localStorage.setItem(key, JSON.stringify(state));
}

function persistProgress() {
  saveState();
}

function showGuestAuth() {
  currentUser = null;
  isAdmin = false;
  $('#header-guest')?.classList.remove('hidden');
  $('#header-user')?.classList.add('hidden');
  $('#logout-btn')?.classList.add('hidden');
  $('#admin-link')?.classList.add('hidden');
  $('#profile-section')?.classList.add('hidden');
}

function setUserAvatarEl(src, bustCache = true) {
  const img = $('#user-avatar');
  if (!img || !src) return;
  const join = src.includes('?') ? '&' : '?';
  const url = bustCache ? `${src}${join}_t=${Date.now()}` : src;
  img.removeAttribute('src');
  img.src = url;
  img.alt = '';
}

async function refreshMyAvatar() {
  if (!currentUser) return;
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    if (!res.ok) return;
    const user = await res.json();
    if (user.avatar) {
      currentUser = { ...currentUser, ...user };
      setUserAvatarEl(user.avatar, true);
      rememberUser(currentUser);
      imgAltFix(currentUser);
    }
  } catch (_) {}
}

function showUserAuth(user) {
  $('#header-guest')?.classList.add('hidden');
  $('#header-user')?.classList.remove('hidden');
  $('#profile-section')?.classList.remove('hidden');

  const avatar = user.avatar || getCachedAvatar(user.id);
  if (avatar) {
    setUserAvatarEl(avatar, true);
    imgAltFix(user);
    rememberUser({ ...user, avatar: user.avatar || avatar });
  }

  const chip = $('#user-chip');
  if (user.isVova) {
    chip?.classList.add('user-chip-vova');
    chip?.setAttribute('aria-label', 'Вова Зинченко — герой игры');
  } else {
    chip?.classList.remove('user-chip-vova');
    chip?.removeAttribute('aria-label');
  }

  const label = user.isVova
    ? 'Вова Зинченко — герой Fauck Zini ✓'
    : user.displayName || user.nickname || user.name || user.email || 'Аккаунт';
  if (chip) chip.title = label;
  const nickInput = $('#nickname-input');
  if (nickInput) nickInput.value = user.nickname || '';
  if (user.isAdmin) $('#admin-link')?.classList.remove('hidden');
  else $('#admin-link')?.classList.add('hidden');

  refreshMyAvatar();
}

function imgAltFix(user) {
  const img = $('#user-avatar');
  if (img) {
    img.alt = user.isVova
      ? 'Вова Зинченко'
      : user.displayName || user.nickname || user.name || '';
  }
}

async function checkAuthConfig() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) return;
    const cfg = await res.json();
    googleAuthReady = cfg.googleAuth;
  } catch (_) {}
}

function initLogin() {
  $('#login-btn')?.addEventListener('click', (e) => {
    if (!googleAuthReady) {
      e.preventDefault();
      alert(
        'Google OAuth не настроен.\n\n' +
        'Railway → Variables:\n' +
        '• GOOGLE_CLIENT_ID\n' +
        '• GOOGLE_CLIENT_SECRET\n' +
        '• BASE_URL = https://vovka-production.up.railway.app\n\n' +
        'Google Console → redirect URI:\n' +
        'https://vovka-production.up.railway.app/auth/google/callback'
      );
    }
  });

  $('#user-chip')?.addEventListener('click', () => {
    $('#logout-btn')?.classList.toggle('hidden');
  });
}

async function reconcileSaveToServer(localPayload) {
  const res = await fetch('/api/save/reconcile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(localPayload),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.save || null;
}

async function loadCloudSave() {
  if (!currentUser) return;

  const userId = currentUser.id;
  const guestLocal = loadLocalState(null);
  const userLocal = loadLocalState(userId);
  const bestLocal = mergeSaveStates(guestLocal, userLocal);

  try {
    const res = await fetch('/api/save', { credentials: 'include', cache: 'no-store' });
    if (res.status === 401) {
      const recovered = await recoverSession();
      if (recovered) return loadCloudSave();
      applySaveData(bestLocal);
      saveState();
      return;
    }
    if (!res.ok) {
      applySaveData(bestLocal);
      saveState();
      return;
    }

    const data = await res.json();
    const cloud = data.save || null;
    const merged = mergeSaveStates(bestLocal, cloud);
    applySaveData(merged);
    saveState();

    if (saveNeedsSync(cloud, merged)) {
      const reconciled = await reconcileSaveToServer(getSavePayload());
      if (reconciled) {
        applySaveData(mergeSaveStates(merged, reconciled));
        saveState();
      }
    }
  } catch (_) {
    applySaveData(bestLocal);
    saveState();
  }
}

async function handleSessionLost() {
  const lastId = getLastUserId();
  currentUser = null;
  isAdmin = false;
  if (lastId) {
    applySaveData(loadLocalState(lastId));
    saveState();
  } else {
    applySaveData(loadLocalState(null));
  }
  showGuestAuth();
  render();
}

async function waitForServer(maxMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch('/api/config', { credentials: 'include' });
      if (res.ok) return true;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

async function fetchMe(retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch('/api/me', { credentials: 'include' });
      if (res.ok) return res.json();
      if (res.status !== 401) return null;
    } catch (_) {}
    if (i < retries - 1) {
      await new Promise((r) => setTimeout(r, 500 + i * 300));
    }
  }
  return null;
}

async function recoverSession() {
  if (sessionRecoveryInProgress) return !!currentUser;
  sessionRecoveryInProgress = true;
  try {
    for (let i = 0; i < 6; i++) {
      const user = await fetchMe(2);
      if (user) {
        currentUser = user;
        rememberUser(user);
        isAdmin = user.isAdmin;
        showUserAuth(user);
        await loadCloudSave();
        render();
        return true;
      }
      await new Promise((r) => setTimeout(r, 700));
    }
    return false;
  } finally {
    sessionRecoveryInProgress = false;
  }
}

async function initAuth() {
  const user = await fetchMe(15);
  if (user) {
    sessionStorage.removeItem(SILENT_AUTH_TRIED);
    currentUser = user;
    rememberUser(user);
    if (currentUser.banned) {
      alert('Аккаунт заблокирован');
      await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
      currentUser = null;
      state = loadLocalState(null);
      showGuestAuth();
      return;
    }
    isAdmin = currentUser.isAdmin;
    showUserAuth(currentUser);
    await loadCloudSave();
    return;
  }

  const lastId = getLastUserId();
  if (lastId) {
    applySaveData(loadLocalState(lastId));
    saveState();
  } else {
    applySaveData(loadLocalState(null));
    saveState();
  }

  if (lastId && !sessionStorage.getItem(SILENT_AUTH_TRIED)) {
    sessionStorage.setItem(SILENT_AUTH_TRIED, '1');
    saveState();
    window.location.href = '/auth/google/silent';
    return;
  }

  currentUser = null;
  isAdmin = false;
  showGuestAuth();
  render();
}

function initLogout() {
  $('#logout-btn')?.addEventListener('click', async () => {
    await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
    currentUser = null;
    isAdmin = false;
    state = loadLocalState(null);
    showGuestAuth();
    render();
  });
}

function handleAuthRedirect() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('auth') === 'failed') {
    alert('Не удалось войти через Google. Попробуй ещё раз.');
  }
  if (params.get('auth') === 'not_configured') {
    alert('Google OAuth не настроен. Замени your-client-id на настоящие ключи в Railway → Variables.');
  }
  if (params.get('auth') === 'banned') {
    alert('Аккаунт заблокирован администратором.');
  }
  if (params.get('auth') === 'rate_limited') {
    alert('Слишком много попыток входа. Подожди минуту и нажми G для входа.');
    sessionStorage.removeItem(SILENT_AUTH_TRIED);
  }
  if (params.get('auth') === 'need_login') {
    sessionStorage.setItem(SILENT_AUTH_TRIED, '1');
  }
  if (params.get('auth') === 'success') {
    sessionStorage.removeItem(SILENT_AUTH_TRIED);
  }
  if (params.has('auth')) {
    window.history.replaceState({}, '', window.location.pathname);
  }
}

function getUpgradePrice(upgrade) {
  const lvl = state.upgradeLevels[upgrade.id];
  return Math.floor(upgrade.basePrice * Math.pow(upgrade.priceMult, lvl));
}

function getUpgradeTapBonus(upgrade, lvl) {
  const eff = upgrade.effect(lvl);
  return eff.perTap || 0;
}

function getUpgradeNextTapGain(upgrade, lvl) {
  if (lvl >= upgrade.maxLevel) return 0;
  return getUpgradeTapBonus(upgrade, lvl + 1) - getUpgradeTapBonus(upgrade, lvl);
}

function formatUpgradeDesc(upgrade, lvl) {
  const nextGain = getUpgradeNextTapGain(upgrade, lvl);
  const total = getUpgradeTapBonus(upgrade, lvl);
  if (lvl >= upgrade.maxLevel && total > 0) {
    return `+${formatNum(total)} за тап суммарно`;
  }
  if (nextGain > 0) {
    const totalNext = total + nextGain;
    return `След. ур.: +${formatNum(nextGain)} за тап · всего +${formatNum(totalNext)}`;
  }
  return upgrade.desc;
}

function getPokemonUpgradePrice(pokemon) {
  const lvl = state.ownedPokemon?.[pokemon.id] || 0;
  if (lvl <= 0 || lvl >= pokemon.maxLevel) return Infinity;
  if (pokemon.upgradePriceAtMax && pokemon.maxLevel > 1) {
    const base = pokemon.upgradeBasePrice;
    const max = pokemon.upgradePriceAtMax;
    const steps = pokemon.maxLevel - 1;
    const t = (steps - lvl) / steps;
    return Math.floor(max * Math.pow(base / max, t));
  }
  return Math.floor(pokemon.upgradeBasePrice * Math.pow(pokemon.upgradePriceMult, lvl - 1));
}

function calcStats() {
  let perTap = 1;
  let maxEnergy = 320;
  let tapMult = 1;
  let energyRegen = 0.18;

  for (const upgrade of UPGRADES) {
    const lvl = state.upgradeLevels[upgrade.id];
    if (lvl === 0) continue;
    const eff = upgrade.effect(lvl);
    if (eff.perTap) perTap += eff.perTap;
    if (eff.maxEnergy) maxEnergy += eff.maxEnergy;
    if (eff.tapMult) tapMult = eff.tapMult;
    if (eff.energyRegen) energyRegen += eff.energyRegen;
  }

  const pokemonStats = calcPokemonStats();

  return {
    perTap: Math.floor(perTap * tapMult),
    perHour: Math.floor(pokemonStats.perHour),
    maxEnergy,
    energyRegen,
    pokemonCount: pokemonStats.count,
    pokemonActive: pokemonStats.active,
  };
}

function applyPokemonPunches(now = Date.now()) {
  const { active } = calcPokemonStats();
  if (!active.length) return { earned: 0, punchEvents: [] };

  if (!state.pokemonMeta) state.pokemonMeta = {};
  if (!state.pokemonFarmBuffer) state.pokemonFarmBuffer = {};

  const maxElapsedMs = 4 * 3600 * 1000;
  let totalEarned = 0;
  const punchEvents = [];

  for (const p of active) {
    const def = POKEMONS.find((x) => x.id === p.id);
    if (!def) continue;

    const key = `lastPunch_${p.id}`;
    const last = state.pokemonMeta[key] || state.lastPassive || now;
    const elapsed = Math.min(Math.max(0, now - last), maxElapsedMs);
    const punches = Math.floor(elapsed / def.punchIntervalMs);
    if (punches <= 0) continue;

    const coinsPerPunch = (p.perHour * def.punchIntervalMs) / 3_600_000;
    state.pokemonFarmBuffer[p.id] = (state.pokemonFarmBuffer[p.id] || 0) + punches * coinsPerPunch;
    const whole = Math.floor(state.pokemonFarmBuffer[p.id]);
    if (whole > 0) {
      state.pokemonFarmBuffer[p.id] -= whole;
      totalEarned += whole;
      punchEvents.push({ id: p.id, earned: whole });
    }
    state.pokemonMeta[key] = last + punches * def.punchIntervalMs;
  }

  if (totalEarned > 0) {
    state.balance += totalEarned;
    state.totalEarned += totalEarned;
    syncMaxLevel();
  }

  return { earned: totalEarned, punchEvents };
}

function levelFromBalance(balance) {
  let level = 1;
  for (const l of PHOTO_LEVELS) {
    if (balance >= l.min) level = l.level;
  }
  return level;
}

function syncMaxLevel(target = state) {
  const fromBalance = levelFromBalance(target.balance || 0);
  target.maxLevel = Math.max(target.maxLevel || 1, fromBalance);
}

function getPhotoLevelData() {
  const maxLevel = state.maxLevel || 1;
  const current = PHOTO_LEVELS[Math.min(maxLevel - 1, PHOTO_LEVELS.length - 1)];
  const balance = state.balance;
  const isMax = maxLevel >= PHOTO_LEVELS.length;
  const nextLevel = maxLevel + 1;
  const nextThreshold = isMax ? null : PHOTO_LEVELS[nextLevel - 1].min;
  const progress = isMax || !nextThreshold
    ? 1
    : Math.min(1, Math.max(0, balance / nextThreshold));
  const remaining = isMax || !nextThreshold ? 0 : Math.max(0, nextThreshold - balance);

  return {
    level: maxLevel,
    name: current.name,
    image: current.image,
    progress,
    remaining,
    isMax,
    nextLevel: isMax ? null : nextLevel,
    nextThreshold,
  };
}

function getLevel() {
  return state.maxLevel || 1;
}

function getRank() {
  return getPhotoLevelData().name;
}

function formatNum(n) {
  if (n >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(1) + 'T';
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 10_000) return (n / 1000).toFixed(1) + 'K';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return Math.floor(n).toLocaleString('ru-RU');
}

function formatCoinsFull(n) {
  return Math.floor(n).toLocaleString('ru-RU');
}

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function render() {
  const stats = calcStats();

  if (state.energy > stats.maxEnergy) state.energy = stats.maxEnergy;

  syncMaxLevel();

  $('#balance').textContent = formatNum(state.balance);
  $('#per-tap').textContent = `+${formatNum(stats.perTap)} за тап`;
  $('#pokemon-hour-total').textContent = `+${formatNum(stats.perHour)}/час`;
  const photoLevel = getPhotoLevelData();
  $('#rank').textContent = photoLevel.name;

  const vovaImg = $('#vova');
  if (vovaImg && currentPhotoSrc !== photoLevel.image) {
    vovaImg.src = photoLevel.image;
    currentPhotoSrc = photoLevel.image;
  }
  if (photoLevel.level > lastPhotoLevel && lastPhotoLevel > 0) {
    vovaImg?.classList.add('level-up-anim');
    setTimeout(() => vovaImg?.classList.remove('level-up-anim'), 600);
  }
  lastPhotoLevel = photoLevel.level;

  const progressPct = photoLevel.progress * 100;
  $('#level-progress-fill').style.width = progressPct + '%';
  $('#level-progress-title').textContent = `Уровень ${photoLevel.level}`;
  $('#level-progress-meta').textContent = photoLevel.isMax
    ? `${photoLevel.name} · макс. 👑`
    : `до ур. ${photoLevel.nextLevel}`;

  if (photoLevel.isMax) {
    $('#level-progress-bar-label').textContent = `${formatCoinsFull(state.balance)} 💪 · макс. уровень`;
  } else {
    $('#level-progress-bar-label').textContent =
      `${formatCoinsFull(state.balance)} / ${formatCoinsFull(photoLevel.nextThreshold)} 💪`;
  }

  const energyPct = (state.energy / stats.maxEnergy) * 100;
  $('#energy-fill').style.width = energyPct + '%';
  $('#energy-fill').classList.toggle('low', energyPct < 20);
  $('#energy-text').textContent = `${Math.floor(state.energy)} / ${stats.maxEnergy}`;

  $('#stat-taps').textContent = formatNum(state.totalTaps);
  $('#stat-earned').textContent = formatNum(state.totalEarned);
  $('#stat-pokemon').textContent = `${stats.pokemonCount} / ${getUnlockedSlotCount()}`;
  $('#stat-rank').textContent = `${photoLevel.level} — ${photoLevel.name}`;

  renderUpgrades();
  renderPokemonFarm();
  renderPokemonShop();
}

function getPokemonFarmRenderKey() {
  return JSON.stringify({
    owned: state.ownedPokemon || {},
    deployed: state.pokemonDeployed || [],
    slots: getUnlockedSlotCount(),
  });
}

function buildPokemonFarm() {
  const farm = $('#pokemon-farm');
  if (!farm) return;

  const owned = state.ownedPokemon || {};
  const unlockedSlots = getUnlockedSlotCount();
  normalizePokemonDeployed(state);
  const deployed = state.pokemonDeployed || [];

  farm.innerHTML = '';
  for (let index = 0; index < MAX_POKEMON_SLOTS; index += 1) {
    const pokemonId = index < unlockedSlots ? deployed[index] || null : null;
    const slot =
      pokemonId && (owned[pokemonId] || 0) > 0
        ? {
            pokemon: POKEMONS.find((p) => p.id === pokemonId),
            level: owned[pokemonId],
          }
        : null;
    const el = document.createElement('div');

    if (index >= unlockedSlots) {
      const price = getPokemonSlotPrice(index);
      const canBuy = index === unlockedSlots && state.balance >= price;
      el.className = 'pokemon-slot locked' + (canBuy ? ' can-buy' : '');
      el.dataset.slot = String(index);
      el.innerHTML = `
        <span class="pokemon-slot-lock">🔒</span>
        <span class="pokemon-slot-unlock-price">${formatNum(price)}</span>
        <span class="pokemon-slot-unlock-label">слот</span>
      `;
      el.title = `Открыть слот: ${formatNum(price)} зинкоинов`;
      farm.appendChild(el);
      continue;
    }

    el.className = 'pokemon-slot' + (slot ? ' filled' : ' empty');
    el.dataset.slot = String(index);

    if (!slot) {
      el.innerHTML = '<span class="pokemon-slot-placeholder">+</span>';
      farm.appendChild(el);
      continue;
    }

    const { pokemon, level } = slot;
    const perHour = getPokemonPerHour(pokemon, level);
    const sheet = pokemon.spriteSheet || pokemon.image;
    const frames = pokemon.spriteFrames || 6;
    const spriteClass =
      'pokemon-sprite' +
      (pokemon.fillsSlot ? ' pokemon-sprite--fills-slot' : '') +
      (pokemon.weapon === 'lightsaber' ? ' pokemon-sprite--lightsaber' : '');
    el.innerHTML = `
      <div class="pokemon-slot-stage">
        <div class="pokemon-slot-floor"></div>
        <div
          class="${spriteClass}"
          data-pokemon-id="${pokemon.id}"
          data-frames="${frames}"
          style="--sprite-frames: ${frames}; background-image: url('${sheet}')"
          role="img"
          aria-label="${pokemon.name}"
        ></div>
      </div>
      <span class="pokemon-slot-level">ур. ${level}</span>
      <div class="pokemon-slot-name">${pokemon.name}</div>
    `;
    el.title = `${pokemon.name} · ур. ${level} · +${formatNum(perHour)}/час`;
    farm.appendChild(el);
  }
}

function updatePokemonFarmLevels() {
  const owned = state.ownedPokemon || {};
  for (const pokemon of POKEMONS) {
    const level = owned[pokemon.id] || 0;
    if (level <= 0) continue;
    const sprite = document.querySelector(`.pokemon-sprite[data-pokemon-id="${pokemon.id}"]`);
    const slot = sprite?.closest('.pokemon-slot');
    if (!slot) continue;
    const perHour = getPokemonPerHour(pokemon, level);
    const lvlEl = slot.querySelector('.pokemon-slot-level');
    if (lvlEl) lvlEl.textContent = `ур. ${level}`;
    slot.title = `${pokemon.name} · ур. ${level} · +${formatNum(perHour)}/час`;
  }
}

function updatePokemonFarmLockedSlots() {
  const farm = $('#pokemon-farm');
  if (!farm) return;

  const unlocked = getUnlockedSlotCount();
  farm.querySelectorAll('.pokemon-slot.locked').forEach((el) => {
    const index = Number(el.dataset.slot);
    const price = getPokemonSlotPrice(index);
    const canBuy = index === unlocked && state.balance >= price;
    el.classList.toggle('can-buy', canBuy);
  });
}

function renderPokemonFarm() {
  const farm = $('#pokemon-farm');
  if (!farm) return;

  const key = getPokemonFarmRenderKey();
  if (key !== pokemonFarmRenderKey) {
    pokemonFarmRenderKey = key;
    buildPokemonFarm();
  } else {
    updatePokemonFarmLevels();
    updatePokemonFarmLockedSlots();
  }
}

function triggerPokemonUppercut(pokemonId, earned = 0, showCoin = true) {
  const sprite = document.querySelector(`.pokemon-sprite[data-pokemon-id="${pokemonId}"]`);
  if (!sprite) return;

  const def = POKEMONS.find((p) => p.id === pokemonId);
  const frames = def?.spriteFrames || Number(sprite.dataset.frames) || 6;
  const animMs = def?.animMs || 540;
  const animClass = def?.animClass || 'play-uppercut';
  sprite.style.setProperty('--sprite-frames', String(frames));
  sprite.style.animationDuration = `${animMs}ms`;
  sprite.style.animationTimingFunction = `steps(${Math.max(1, frames - 1)})`;
  sprite.classList.remove(...POKEMON_ANIM_CLASSES);
  void sprite.offsetWidth;
  sprite.classList.add(animClass);

  const slot = sprite.closest('.pokemon-slot');
  if (slot) slot.classList.add('is-animating');

  const onEnd = () => {
    sprite.classList.remove(...POKEMON_ANIM_CLASSES);
    sprite.style.backgroundPosition = '0% bottom';
    sprite.style.transform = '';
    sprite.removeEventListener('animationend', onEnd);
    if (slot) slot.classList.remove('is-animating');
  };
  sprite.addEventListener('animationend', onEnd);

  if (!slot || !showCoin || earned <= 0) return;
  const coin = document.createElement('span');
  coin.className = 'pokemon-slot-coin';
  coin.textContent = `+${formatNum(earned)}`;
  slot.appendChild(coin);
  setTimeout(() => coin.remove(), 750);
}

function triggerAllPokemonUppercutOnTap() {
  const { active } = calcPokemonStats();
  for (const p of active) {
    triggerPokemonUppercut(p.id, 0, false);
  }
}

function renderPokemonShop() {
  const list = $('#pokemon-shop-list');
  if (!list) return;
  list.innerHTML = '';

  const owned = state.ownedPokemon || {};

  for (const pokemon of POKEMONS) {
    const level = owned[pokemon.id] || 0;
    const isOwned = level > 0;
    const deployed = isOwned && isPokemonDeployed(pokemon.id);
    const maxed = isOwned && level >= pokemon.maxLevel;
    const canBuy = !isOwned && state.balance >= pokemon.price;
    const upPrice = getPokemonUpgradePrice(pokemon);
    const canUpgrade = isOwned && !maxed && state.balance >= upPrice;
    const perHour = isOwned
      ? getPokemonPerHour(pokemon, level)
      : getPokemonPerHour(pokemon, 1);

    const card = document.createElement('div');
    card.className =
      'pokemon-shop-card' +
      (canBuy || canUpgrade ? ' can-buy' : '') +
      (isOwned ? ' owned' : '') +
      (maxed ? ' maxed' : '');
    card.dataset.pokemonId = pokemon.id;
    card.innerHTML = `
      <img class="pokemon-shop-thumb" src="${pokemon.image}" alt="${pokemon.name}" draggable="false">
      <div class="pokemon-shop-info">
        <div class="pokemon-shop-name">${pokemon.name}</div>
        <div class="pokemon-shop-desc">${pokemon.desc}</div>
        <div class="pokemon-shop-meta">
          ${
            isOwned
              ? `Ур. ${level}${maxed ? ' (макс.)' : ''} · +${formatNum(perHour)}/час · ${deployed ? 'в бою' : 'в запасе'}`
              : `+${formatNum(getPokemonPerHour(pokemon, 1))}/час · ${pokemon.weapon === 'lightsaber' ? 'меч' : 'кулаки'}`
          }
        </div>
      </div>
      <div class="pokemon-shop-price">
        ${
          maxed
            ? '<span class="price-value">✓</span>'
            : isOwned
              ? `<div class="price-value">💪 ${formatNum(upPrice)}</div><div class="price-label">качнуть</div>`
              : `<div class="price-value">💪 ${formatNum(pokemon.price)}</div><div class="price-label">купить</div>`
        }
      </div>
    `;

    if (isOwned) {
      const deployBtn = document.createElement('button');
      deployBtn.type = 'button';
      deployBtn.className = 'pokemon-deploy-btn' + (deployed ? ' active' : '');
      deployBtn.textContent = deployed ? 'Убрать' : 'В бой';
      deployBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePokemonDeploy(pokemon);
      });
      card.appendChild(deployBtn);
    }

    list.appendChild(card);
  }
}

async function upgradePokemon(pokemon) {
  if (shopActionBusy) return;
  const lvl = state.ownedPokemon?.[pokemon.id] || 0;
  if (lvl <= 0 || lvl >= pokemon.maxLevel) return;
  const price = getPokemonUpgradePrice(pokemon);
  if (state.balance < price) return;

  shopActionBusy = true;
  try {
  if (currentUser) {
    const res = await fetch('/api/upgrade-pokemon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ pokemonId: pokemon.id }),
    });
    if (!res.ok) return;
    const data = await res.json();
    applySaveData(data.save, { authoritative: true });
    pokemonFarmRenderKey = '';
    triggerPokemonUppercut(pokemon.id, 0, false);
    saveState();
    render();
    refreshLeaderboardIfActive();
    return;
  }

  state.balance -= price;
  state.ownedPokemon[pokemon.id] = lvl + 1;
  pokemonFarmRenderKey = '';
  triggerPokemonUppercut(pokemon.id, 0, false);
  saveState();
  render();
  } finally {
    shopActionBusy = false;
  }
}

async function buyPokemonSlot(slotIndex) {
  if (shopActionBusy) return;
  const unlocked = getUnlockedSlotCount();
  if (slotIndex !== unlocked) return;
  const price = getPokemonSlotPrice(slotIndex);
  if (state.balance < price) return;

  shopActionBusy = true;
  try {
  if (currentUser) {
    const res = await fetch('/api/buy-pokemon-slot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ slotIndex }),
    });
    if (!res.ok) return;
    const data = await res.json();
    applySaveData(data.save, { authoritative: true });
    pokemonFarmRenderKey = '';
    saveState();
    render();
    refreshLeaderboardIfActive();
    return;
  }

  state.balance -= price;
  state.pokemonSlotsUnlocked = unlocked + 1;
  pokemonFarmRenderKey = '';
  saveState();
  render();
  } finally {
    shopActionBusy = false;
  }
}

async function togglePokemonDeploy(pokemon) {
  if (shopActionBusy) return;
  const deploy = !isPokemonDeployed(pokemon.id);
  if (deploy && !hasEmptyDeploySlot()) return;

  shopActionBusy = true;
  try {
  if (currentUser) {
    const res = await fetch('/api/pokemon-deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ pokemonId: pokemon.id, deploy }),
    });
    if (!res.ok) return;
    const data = await res.json();
    applySaveData(data.save, { authoritative: true });
    pokemonFarmRenderKey = '';
    saveState();
    render();
    return;
  }

  if (!state.pokemonDeployed) state.pokemonDeployed = defaultPokemonDeployed();
  normalizePokemonDeployed(state);
  if (deploy) {
    const unlocked = getUnlockedSlotCount();
    const free = state.pokemonDeployed.slice(0, unlocked).findIndex((id) => !id);
    if (free < 0) return;
    state.pokemonDeployed[free] = pokemon.id;
  } else {
    const idx = state.pokemonDeployed.indexOf(pokemon.id);
    if (idx >= 0) state.pokemonDeployed[idx] = null;
  }
  pokemonFarmRenderKey = '';
  saveState();
  render();
  } finally {
    shopActionBusy = false;
  }
}

async function buyPokemon(pokemon) {
  if (shopActionBusy) return;
  if ((state.ownedPokemon[pokemon.id] || 0) > 0) return;
  if (state.balance < pokemon.price) return;

  shopActionBusy = true;
  try {
  if (currentUser) {
    const res = await fetch('/api/buy-pokemon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ pokemonId: pokemon.id }),
    });
    if (!res.ok) return;
    const data = await res.json();
    applySaveData(data.save, { authoritative: true });
    pokemonFarmRenderKey = '';
    saveState();
    render();
    refreshLeaderboardIfActive();
    return;
  }

  state.balance -= pokemon.price;
  if (!state.ownedPokemon) state.ownedPokemon = {};
  state.ownedPokemon[pokemon.id] = 1;
  if (!state.pokemonDeployed) state.pokemonDeployed = defaultPokemonDeployed();
  normalizePokemonDeployed(state);
  if (hasEmptyDeploySlot()) {
    const unlocked = getUnlockedSlotCount();
    const free = state.pokemonDeployed.slice(0, unlocked).findIndex((id) => !id);
    if (free >= 0) state.pokemonDeployed[free] = pokemon.id;
  }
  pokemonFarmRenderKey = '';
  if (!state.pokemonMeta) state.pokemonMeta = {};
  state.pokemonMeta[`lastPunch_${pokemon.id}`] = Date.now();
  saveState();
  render();
  } finally {
    shopActionBusy = false;
  }
}

function renderUpgrades() {
  const list = $('#upgrades-list');
  list.innerHTML = '';

  for (const upgrade of UPGRADES) {
    const lvl = state.upgradeLevels[upgrade.id];
    const maxed = lvl >= upgrade.maxLevel;
    const price = getUpgradePrice(upgrade);
    const canBuy = !maxed && state.balance >= price;

    const card = document.createElement('div');
    card.className = 'upgrade-card' + (canBuy ? ' can-buy' : '') + (maxed ? ' maxed' : '');
    card.dataset.upgradeId = upgrade.id;
    card.innerHTML = `
      <div class="upgrade-icon">${upgrade.icon}</div>
      <div class="upgrade-info">
        <div class="upgrade-name">${upgrade.name}</div>
        <div class="upgrade-desc">${formatUpgradeDesc(upgrade, lvl)}</div>
        <div class="upgrade-level">Ур. ${lvl}${maxed ? ' (макс.)' : ''}</div>
      </div>
      <div class="upgrade-price">
        ${maxed
          ? '<span class="price-value">✓</span>'
          : `<div class="price-value">💪 ${formatNum(price)}</div><div class="price-label">купить</div>`}
      </div>
    `;

    list.appendChild(card);
  }
}

async function buyUpgrade(upgrade) {
  if (shopActionBusy) return;
  shopActionBusy = true;
  try {
  if (currentUser) {
    const res = await fetch('/api/buy-upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ upgradeId: upgrade.id }),
    });
    if (!res.ok) return;
    const data = await res.json();
    applySaveData(data.save, { authoritative: true });
    saveState();
    render();
    refreshLeaderboardIfActive();
    return;
  }

  const price = getUpgradePrice(upgrade);
  const lvl = state.upgradeLevels[upgrade.id];
  if (lvl >= upgrade.maxLevel || state.balance < price) return;

  state.balance -= price;
  state.upgradeLevels[upgrade.id]++;
  saveState();
  render();
  } finally {
    shopActionBusy = false;
  }
}

function spawnFloat(x, y, amount) {
  const container = $('#float-container');
  const el = document.createElement('div');
  el.className = 'float-coin';
  el.textContent = `+${amount}`;
  const rect = container.getBoundingClientRect();
  el.style.left = (x - rect.left - 20) + 'px';
  el.style.top = (y - rect.top - 10) + 'px';
  container.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

function playTapAnim(e, earned) {
  const img = $('#vova');
  img.classList.remove('tap-anim');
  void img.offsetWidth;
  img.classList.add('tap-anim');

  triggerAllPokemonUppercutOnTap();

  const balanceEl = $('#balance');
  balanceEl.classList.remove('bump');
  void balanceEl.offsetWidth;
  balanceEl.classList.add('bump');

  const x = e?.clientX ?? e?.touches?.[0]?.clientX ?? 200;
  const y = e?.clientY ?? e?.touches?.[0]?.clientY ?? 300;
  spawnFloat(x, y, earned);
}

function pendingTapCount() {
  return tapQueue.length + (tapQueueRunning ? 1 : 0);
}

function applyOptimisticTap() {
  const stats = calcStats();
  if (state.energy < 1) return null;
  state.energy -= 1;
  const earned = stats.perTap;
  state.balance += earned;
  state.totalTaps += 1;
  state.totalEarned += earned;
  syncMaxLevel();
  saveState();
  return earned;
}

function mergeServerTapSave(serverSave) {
  const pending = pendingTapCount();
  const localEnergy = state.energy;
  const localBalance = state.balance;
  const localTaps = state.totalTaps;
  const localEarned = state.totalEarned;

  applySaveData(serverSave);
  state.energy = Math.min(localEnergy, Math.max(0, serverSave.energy - pending));
  state.balance = Math.max(serverSave.balance ?? 0, localBalance);
  state.totalTaps = Math.max(serverSave.totalTaps ?? 0, localTaps);
  state.totalEarned = Math.max(serverSave.totalEarned ?? 0, localEarned);
  syncMaxLevel();
}

function enqueueTap(e) {
  const earned = applyOptimisticTap();
  if (earned == null) return;
  playTapAnim(e, earned);
  render();
  tapQueue.push(e);
  drainTapQueue();
}

async function drainTapQueue() {
  if (tapQueueRunning) return;
  tapQueueRunning = true;

  while (tapQueue.length > 0) {
    const e = tapQueue.shift();
    const ok = await sendTapToServer(e);
    if (!ok) break;
  }

  tapQueueRunning = false;
  if (tapQueue.length > 0) drainTapQueue();
}

async function sendTapToServer(e, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch('/api/tap', { method: 'POST', credentials: 'include' });
      if (res.status === 403) {
        const data = await res.json();
        alert(`Заблокировано: ${data.reason || 'читы'}`);
        window.location.reload();
        return false;
      }
      if (res.status === 429) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 50 + attempt * 35));
          continue;
        }
        tapQueue.unshift(e);
        await new Promise((r) => setTimeout(r, 100));
        return false;
      }
      if (res.status === 401) {
        const ok = await recoverSession();
        if (!ok) {
          await handleSessionLost();
          return false;
        }
        continue;
      }
      if (res.status === 400) {
        tapQueue.length = 0;
        try {
          const tick = await fetch('/api/tick', { method: 'POST', credentials: 'include' });
          if (tick.ok) {
            const { save } = await tick.json();
            applySaveData(mergeSaveStates(state, save));
          }
        } catch (_) {}
        render();
        saveState();
        return false;
      }
      if (!res.ok) return true;
      const data = await res.json();
      mergeServerTapSave(data.save);
      render();
      saveState();
      refreshLeaderboardIfActive();
      return true;
    } catch (_) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 80));
        continue;
      }
      return true;
    }
  }
  return true;
}

async function tap(e) {
  if (currentUser) {
    enqueueTap(e);
    return;
  }

  const stats = calcStats();
  if (state.energy < 1) return;

  state.energy -= 1;
  const earned = stats.perTap;
  state.balance += earned;
  state.totalTaps++;
  state.totalEarned += earned;

  playTapAnim(e, earned);
  render();
  saveState();
}

function applyPassive() {
  const now = Date.now();
  const stats = calcStats();
  const elapsed = (now - state.lastPassive) / 1000;
  if (elapsed <= 0) return;

  state.lastPassive = now;
  applyPokemonPunches(now);

  const regen = stats.energyRegen * elapsed;
  state.energy = Math.min(stats.maxEnergy, state.energy + regen);

  render();
}

function estimatePokemonPunchCoins(pokemon, level) {
  const perHour = getPokemonPerHour(pokemon, level);
  return Math.max(1, Math.floor((perHour * pokemon.punchIntervalMs) / 3_600_000));
}

function initPokemonVisualLoop() {
  setInterval(() => {
    const now = Date.now();
    const { active } = calcPokemonStats();
    if (!active.length) return;

    for (const p of active) {
      const def = POKEMONS.find((x) => x.id === p.id);
      if (!def) continue;

      const visualKey = `${p.id}_visual`;
      const lastVisual = pokemonVisualTimers[visualKey] || 0;
      if (now - lastVisual < def.punchIntervalMs) continue;
      pokemonVisualTimers[visualKey] = now;
      triggerPokemonUppercut(p.id, estimatePokemonPunchCoins(def, p.level));
    }
  }, 400);
}

function isLeaderboardActive() {
  return $('#panel-leaderboard')?.classList.contains('active');
}

function isMePlayer(p) {
  if (!currentUser) return false;
  return Number(p.id) === Number(currentUser.id) || !!p.isMe;
}

function paintLeaderboard(players, total, myRank) {
  const list = $('#leaderboard-list');
  const totalEl = $('#lb-total');
  const myRankEl = $('#lb-my-rank');
  const findBtn = $('#lb-find-me');
  if (!list) return;

  if (totalEl) {
    totalEl.textContent = `Игроков: ${total ?? players.length}`;
  }

  list.innerHTML = '';
  if (!players.length) {
    if (totalEl) totalEl.textContent = 'Игроков: 0';
    findBtn?.classList.add('hidden');
    myRankEl?.classList.add('hidden');
    list.innerHTML = '<p class="lb-empty">Пока никого нет — войди через Google!</p>';
    return;
  }

  let hasMe = false;
  let resolvedMyRank = myRank;

  for (const p of players) {
    const me = isMePlayer(p);
    if (me) {
      hasMe = true;
      resolvedMyRank = resolvedMyRank || p.rank;
    }

    const card = document.createElement('div');
    card.className = 'lb-card';
    if (p.isVova) card.classList.add('lb-vova');
    else if (p.rank === 1) card.classList.add('lb-gold');
    if (me) {
      card.classList.add('lb-me');
      card.id = 'lb-me';
    }

    const rank = document.createElement('span');
    rank.className = 'lb-rank';
    rank.textContent = `#${p.rank}`;

    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'lb-avatar-wrap';
    if (p.isVova) {
      const fire = document.createElement('span');
      fire.className = 'lb-vova-fire';
      fire.setAttribute('aria-hidden', 'true');
      avatarWrap.appendChild(fire);
    }

    if (p.avatar) {
      const img = document.createElement('img');
      img.className = 'lb-avatar';
      img.src = p.avatar;
      img.alt = p.isVova ? 'Вова Зинченко' : '';
      avatarWrap.appendChild(img);
    } else {
      const ph = document.createElement('span');
      ph.className = 'lb-avatar-ph';
      ph.textContent = p.isVova ? '🔥' : '💪';
      avatarWrap.appendChild(ph);
    }

    card.appendChild(rank);
    card.appendChild(avatarWrap);

    const info = document.createElement('div');
    info.className = 'lb-info';
    const name = document.createElement('span');
    name.className = 'lb-name';
    name.textContent = p.name || 'Игрок';
    if (p.isVova) {
      const tick = document.createElement('span');
      tick.className = 'lb-vova-tick';
      tick.title = 'Верифицирован — это Вова лично';
      tick.textContent = '✓';
      name.appendChild(tick);
    }
    if (me) {
      const badge = document.createElement('span');
      badge.className = 'lb-you-badge';
      badge.textContent = 'ТЫ';
      name.appendChild(badge);
    }
    const level = document.createElement('span');
    level.className = 'lb-level';
    if (p.isVova) {
      level.className = 'lb-level lb-vova-tag';
      level.textContent = `Герой игры · место #${p.rank} · Ур. ${p.maxLevel}`;
    } else {
      level.textContent = `Ур. ${p.maxLevel}`;
    }
    info.appendChild(name);
    info.appendChild(level);

    const coins = document.createElement('span');
    coins.className = 'lb-coins';
    coins.textContent = `${formatCoinsFull(p.totalEarned ?? p.balance)} 💪`;

    card.appendChild(info);
    card.appendChild(coins);
    list.appendChild(card);
  }

  if (hasMe && resolvedMyRank) {
    myRankEl?.classList.remove('hidden');
    if (myRankEl) {
      myRankEl.textContent = `Твоё место: #${resolvedMyRank} · ${formatCoinsFull(state.totalEarned)} 💪 заработано`;
    }
    findBtn?.classList.remove('hidden');
  } else {
    myRankEl?.classList.add('hidden');
    findBtn?.classList.add('hidden');
    if (!currentUser && myRankEl) {
      myRankEl.classList.remove('hidden');
      myRankEl.textContent = 'Войди через Google — попадёшь в общий рейтинг';
    }
  }
}

async function renderLeaderboard(silent = false) {
  const list = $('#leaderboard-list');
  if (!list) return;
  if (!silent) list.innerHTML = '<p class="lb-loading">Загрузка...</p>';

  try {
    const res = await fetch('/api/leaderboard', { credentials: 'include' });
    if (!res.ok) throw new Error('bad status');
    const data = await res.json();
    const players = data.players || data.top || [];
    paintLeaderboard(players, data.total ?? players.length, data.myRank);
  } catch (_) {
    if (!silent) list.innerHTML = '<p class="lb-empty">Ошибка загрузки</p>';
  }
}

function refreshLeaderboardIfActive() {
  if (isLeaderboardActive()) renderLeaderboard(true);
}

function startLeaderboardLive() {
  stopLeaderboardLive();
  leaderboardPollTimer = setInterval(() => {
    if (isLeaderboardActive()) renderLeaderboard(true);
  }, 4000);
}

function stopLeaderboardLive() {
  if (leaderboardPollTimer) {
    clearInterval(leaderboardPollTimer);
    leaderboardPollTimer = null;
  }
}

function initLeaderboard() {
  $('#lb-find-me')?.addEventListener('click', () => {
    const me = document.getElementById('lb-me');
    if (me) {
      me.scrollIntoView({ behavior: 'smooth', block: 'center' });
      me.classList.add('lb-gold');
      setTimeout(() => me.classList.remove('lb-gold'), 1200);
    }
  });
  startLeaderboardLive();
}

function initNickname() {
  const saveBtn = $('#nickname-save-btn');
  const input = $('#nickname-input');
  if (!saveBtn || !input) return;

  const save = async () => {
    if (!currentUser) return;
    const res = await fetch('/api/nickname', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ nickname: input.value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || 'Не удалось сохранить ник');
      return;
    }
    currentUser = {
      ...currentUser,
      nickname: data.nickname,
      displayName: data.displayName,
    };
    rememberUser(currentUser);
    $('#user-chip').title = data.displayName || 'Аккаунт';
    imgAltFix(currentUser);
    renderLeaderboard();
    saveBtn.textContent = 'Сохранено';
    setTimeout(() => {
      saveBtn.textContent = 'Сохранить';
    }, 1200);
  };

  saveBtn.addEventListener('click', save);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') save();
  });
}

function initAvatar() {
  $('#avatar-upload-btn')?.addEventListener('click', () => {
    $('#avatar-input')?.click();
  });

  $('#avatar-input')?.addEventListener('change', async (ev) => {
    const file = ev.target.files?.[0];
    if (!file || !currentUser) return;
    if (file.size > 2_000_000) {
      alert('Макс. 2 МБ');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const res = await fetch('/api/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ image: reader.result }),
      });
      if (!res.ok) {
        alert('Не удалось загрузить');
        return;
      }
      const data = await res.json();
      if (data.avatar) {
        currentUser = { ...currentUser, avatar: data.avatar, hasCustomAvatar: true };
        setUserAvatarEl(data.avatar, true);
        rememberUser(currentUser);
        await refreshMyAvatar();
      }
      renderLeaderboard();
    };
    reader.readAsDataURL(file);
  });
}

function switchTab(tabId) {
  $$('.tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === tabId);
  });
  $$('.panel').forEach((p) => p.classList.remove('active'));
  $(`#panel-${tabId}`)?.classList.add('active');
  if (tabId === 'leaderboard') {
    renderLeaderboard();
    startLeaderboardLive();
  }
}

function initTabs() {
  $$('.tab').forEach((tab) => {
    tab.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      switchTab(tab.dataset.tab);
    });
  });
}

function initShopPanels() {
  $('#upgrades-list')?.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.upgrade-card.can-buy');
    if (!card) return;
    const upgrade = UPGRADES.find((u) => u.id === card.dataset.upgradeId);
    if (upgrade) buyUpgrade(upgrade);
  });

  $('#pokemon-shop-list')?.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.pokemon-deploy-btn')) return;
    const card = e.target.closest('.pokemon-shop-card.can-buy');
    if (!card) return;
    const pokemon = POKEMONS.find((p) => p.id === card.dataset.pokemonId);
    if (!pokemon) return;
    const owned = state.ownedPokemon?.[pokemon.id] || 0;
    if (owned > 0) upgradePokemon(pokemon);
    else buyPokemon(pokemon);
  });

  $('#pokemon-farm')?.addEventListener('pointerdown', (e) => {
    const slot = e.target.closest('.pokemon-slot.locked.can-buy');
    if (!slot) return;
    const index = Number(slot.dataset.slot);
    if (Number.isFinite(index)) buyPokemonSlot(index);
  });
}

function initTap() {
  const zone = $('#tap-zone');
  let startX = 0;
  let startY = 0;
  let active = false;
  let activePointerId = null;

  zone.addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType === 'touch') {
        e.preventDefault();
        tap(e);
        return;
      }
      startX = e.clientX;
      startY = e.clientY;
      active = true;
      activePointerId = e.pointerId;
      try {
        zone.setPointerCapture(e.pointerId);
      } catch (_) {}
    },
    { passive: false }
  );

  zone.addEventListener(
    'pointerup',
    (e) => {
      if (e.pointerType === 'touch') return;
      if (!active || e.pointerId !== activePointerId) return;
      active = false;
      activePointerId = null;
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx < 24 && dy < 24) tap(e);
    },
    { passive: true }
  );

  zone.addEventListener('pointercancel', (e) => {
    if (e.pointerId === activePointerId) {
      active = false;
      activePointerId = null;
    }
  });

  const desktopKeyboard = window.matchMedia('(hover: hover)');
  let spaceHeld = false;

  function isSpaceKey(e) {
    return e.code === 'Space' || e.key === ' ';
  }

  function isTypingElement(el) {
    if (!el || el.isContentEditable) return !!el?.isContentEditable;
    const tag = el.tagName;
    if (tag === 'TEXTAREA') return true;
    if (tag === 'INPUT') {
      const type = (el.type || 'text').toLowerCase();
      return type !== 'button' && type !== 'submit' && type !== 'checkbox' && type !== 'radio';
    }
    return false;
  }

  function releaseSpace() {
    spaceHeld = false;
  }

  function onSpaceDown(e) {
    if (!desktopKeyboard.matches) return;
    if (!isSpaceKey(e)) return;
    if (isTypingElement(document.activeElement)) return;
    e.preventDefault();
    e.stopPropagation();
    if (spaceHeld || e.repeat) return;
    spaceHeld = true;
    const rect = zone.getBoundingClientRect();
    tap({
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    });
  }

  function onSpaceUp(e) {
    if (!isSpaceKey(e)) return;
    releaseSpace();
  }

  window.addEventListener('keydown', onSpaceDown, true);
  window.addEventListener('keyup', onSpaceUp, true);
  window.addEventListener('blur', releaseSpace);
}

function initOfflineProgress() {
  if (currentUser) return;

  const now = Date.now();
  const offline = (now - (state.lastSave || now)) / 1000;
  if (offline > 5) {
    const stats = calcStats();
    state.lastPassive = now - offline * 1000;
    applyPokemonPunches(now);
    const regen = stats.energyRegen * offline;
    state.energy = Math.min(stats.maxEnergy, state.energy + regen);
  }
  state.lastPassive = now;
}

async function ensureLatestAssets() {
  try {
    const res = await fetch('/api/config', { cache: 'no-store', credentials: 'include' });
    if (!res.ok) return true;
    const { assetVersion } = await res.json();
    if (!assetVersion) return true;
    const scriptSrc = document.querySelector('script[src*="game.js"]')?.src || '';
    const loadedV = scriptSrc.match(/[?&]v=([^&]+)/)?.[1];
    if (loadedV && loadedV !== assetVersion) {
      const key = `asset-${assetVersion}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        location.reload();
        return false;
      }
    }
  } catch (_) {}
  return true;
}

async function boot() {
  handleAuthRedirect();
  if (!(await ensureLatestAssets())) return;
  initTabs();
  initShopPanels();
  initTap();
  initPokemonVisualLoop();
  initLogin();
  initLogout();
  initAvatar();
  initNickname();
  initLeaderboard();
  await checkAuthConfig();
  await waitForServer();
  await initAuth();
  syncMaxLevel();
  initOfflineProgress();
  render();

  if (new URLSearchParams(window.location.search).get('auth') === 'success' && currentUser) {
    window.history.replaceState({}, '', window.location.pathname);
  }

  setInterval(async () => {
    if (currentUser) {
      try {
        const res = await fetch('/api/tick', { method: 'POST', credentials: 'include' });
        if (res.status === 401) {
          const ok = await recoverSession();
          if (!ok) await handleSessionLost();
          return;
        }
        if (res.ok) {
          const { save, punchEvents } = await res.json();
          const prevBalance = state.balance;
          applySaveData(mergeSaveStates(state, save));
          if (Array.isArray(punchEvents)) {
            for (const ev of punchEvents) {
              triggerPokemonUppercut(ev.id, ev.earned);
            }
          } else if (save.balance > prevBalance) {
            const stats = calcStats();
            for (const p of stats.pokemonActive || []) {
              triggerPokemonUppercut(p.id, 0, false);
            }
          }
          render();
          saveState();
          refreshLeaderboardIfActive();
        }
      } catch (_) {}
    } else {
      applyPassive();
      saveState();
      render();
    }
  }, 5000);

  window.addEventListener('beforeunload', persistProgress);
  window.addEventListener('pagehide', persistProgress);

  setInterval(() => {
    if (currentUser || state.totalTaps > 0 || state.balance > 0) {
      saveState();
    }
  }, 2000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveState();
      if (currentUser) {
        fetch('/api/tick', { method: 'POST', credentials: 'include', keepalive: true }).catch(
          () => {}
        );
      }
    }
    if (document.visibilityState === 'visible' && currentUser) {
      fetchMe(4).then(async (user) => {
        if (!user) return;
        currentUser = user;
        rememberUser(user);
        isAdmin = user.isAdmin;
        showUserAuth(user);
        await loadCloudSave();
        render();
        refreshLeaderboardIfActive();
      });
    }
  });
}

boot();
