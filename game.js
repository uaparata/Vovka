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

const UPGRADES = [
  {
    id: 'protein',
    name: 'Протеин',
    icon: '🥤',
    desc: '+1 зинкоин за тап',
    basePrice: 50,
    priceMult: 1.6,
    maxLevel: 50,
    effect: (lvl) => ({ perTap: lvl }),
  },
  {
    id: 'gym',
    name: 'Абонемент в зал',
    icon: '🏋️',
    desc: '+3 зинкоина за тап',
    basePrice: 250,
    priceMult: 1.7,
    maxLevel: 30,
    effect: (lvl) => ({ perTap: lvl * 3 }),
  },
  {
    id: 'creatine',
    name: 'Креатин',
    icon: '💊',
    desc: '+200 зинкоинов в час',
    basePrice: 500,
    priceMult: 1.65,
    maxLevel: 25,
    effect: (lvl) => ({ perHour: lvl * 200 }),
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
    id: 'ring',
    name: 'Кольцо силы',
    icon: '💍',
    desc: '+150% к пассивному доходу за уровень',
    basePrice: 2000,
    priceMult: 2.2,
    maxLevel: 8,
    effect: (lvl) => ({ hourMult: 1 + lvl * 1.5 }),
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

const defaultState = () => ({
  balance: 0,
  energy: 320,
  totalTaps: 0,
  totalEarned: 0,
  maxLevel: 1,
  peakBalance: 0,
  upgradeLevels: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])),
  lastSave: Date.now(),
  lastPassive: Date.now(),
  lastEnergyRegen: Date.now(),
});

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
  return (
    upgradeSum === 0 &&
    (save.totalTaps || 0) === 0 &&
    (save.totalEarned || 0) === 0 &&
    (save.balance || 0) === 0 &&
    (save.maxLevel || 1) <= 1
  );
}

function mergeSaveStates(...saves) {
  const valid = saves.filter(Boolean);
  if (!valid.length) return defaultState();

  const resetSave = valid.find(isFreshResetSave);
  if (resetSave && valid.some((s) => !isFreshResetSave(s) && (s.totalEarned || 0) > 0)) {
    return { ...defaultState(), ...resetSave };
  }

  const primary = valid.reduce((a, b) =>
    (a.totalEarned || 0) >= (b.totalEarned || 0) ? a : b
  );

  const upgradeLevels = { ...defaultState().upgradeLevels };
  for (const s of valid) {
    for (const [id, lvl] of Object.entries(s.upgradeLevels || {})) {
      upgradeLevels[id] = Math.max(upgradeLevels[id] || 0, lvl || 0);
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

function getSavePayload() {
  return {
    balance: state.balance,
    energy: state.energy,
    totalTaps: state.totalTaps,
    totalEarned: state.totalEarned,
    maxLevel: state.maxLevel,
    peakBalance: state.peakBalance,
    upgradeLevels: state.upgradeLevels,
    lastPassive: state.lastPassive,
    lastEnergyRegen: state.lastEnergyRegen,
    lastSave: state.lastSave,
  };
}

function applySaveData(data) {
  const base = defaultState();
  state = {
    ...base,
    balance: data.balance ?? 0,
    energy: data.energy ?? 320,
    totalTaps: data.totalTaps ?? 0,
    totalEarned: data.totalEarned ?? 0,
    maxLevel: data.maxLevel ?? 1,
    peakBalance: data.peakBalance ?? 0,
    upgradeLevels: isFreshResetSave(data)
      ? { ...base.upgradeLevels }
      : { ...base.upgradeLevels, ...(data.upgradeLevels || {}) },
    lastPassive: data.lastPassive ?? Date.now(),
    lastEnergyRegen: data.lastEnergyRegen ?? data.lastPassive ?? Date.now(),
    lastSave: data.lastSave ?? Date.now(),
  };
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
    if (cloud && isFreshResetSave(cloud)) {
      applySaveData(cloud);
      saveState();
    } else {
      const merged = mergeSaveStates(bestLocal, cloud);
      applySaveData(merged);
      saveState();
    }

    const reconciled = await reconcileSaveToServer(getSavePayload());
    if (reconciled) {
      applySaveData(reconciled);
      saveState();
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

function calcStats() {
  let perTap = 1;
  let perHour = 0;
  let maxEnergy = 320;
  let tapMult = 1;
  let hourMult = 1;
  let energyRegen = 0.18;

  for (const upgrade of UPGRADES) {
    const lvl = state.upgradeLevels[upgrade.id];
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
  $('#per-hour').textContent = `+${formatNum(stats.perHour)}/час`;
  const photoLevel = getPhotoLevelData();
  $('#level').textContent = photoLevel.level;
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
    ? `${photoLevel.name} 👑`
    : `→ уровень ${photoLevel.nextLevel}`;

  if (photoLevel.isMax) {
    $('#level-progress-bar-label').textContent = 'Максимальный уровень 👑';
  } else {
    const pct = Math.floor(photoLevel.progress * 100);
    $('#level-progress-bar-label').textContent =
      `${formatCoinsFull(photoLevel.nextThreshold)} 💪 · ${pct}%`;
  }

  const energyPct = (state.energy / stats.maxEnergy) * 100;
  $('#energy-fill').style.width = energyPct + '%';
  $('#energy-fill').classList.toggle('low', energyPct < 20);
  $('#energy-text').textContent = `${Math.floor(state.energy)} / ${stats.maxEnergy}`;

  $('#stat-taps').textContent = formatNum(state.totalTaps);
  $('#stat-earned').textContent = formatNum(state.totalEarned);
  $('#stat-upgrades').textContent = Object.values(state.upgradeLevels).reduce((a, b) => a + b, 0);
  $('#stat-rank').textContent = `${photoLevel.level} — ${photoLevel.name}`;

  renderUpgrades();
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
    card.innerHTML = `
      <div class="upgrade-icon">${upgrade.icon}</div>
      <div class="upgrade-info">
        <div class="upgrade-name">${upgrade.name}</div>
        <div class="upgrade-desc">${upgrade.desc}</div>
        <div class="upgrade-level">Ур. ${lvl}${maxed ? ' (макс.)' : ''}</div>
      </div>
      <div class="upgrade-price">
        ${maxed
          ? '<span class="price-value">✓</span>'
          : `<div class="price-value">💪 ${formatNum(price)}</div><div class="price-label">купить</div>`}
      </div>
    `;

    if (!maxed) {
      card.addEventListener('click', () => buyUpgrade(upgrade));
    }

    list.appendChild(card);
  }
}

async function buyUpgrade(upgrade) {
  if (currentUser) {
    const res = await fetch('/api/buy-upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ upgradeId: upgrade.id }),
    });
    if (!res.ok) return;
    const data = await res.json();
    applySaveData(data.save);
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
            applySaveData(save);
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
  state.lastPassive = now;

  if (stats.perHour > 0 && elapsed > 0) {
    const earned = (stats.perHour / 3600) * elapsed;
    state.balance += earned;
    state.totalEarned += earned;
  }

  const regen = stats.energyRegen * elapsed;
  state.energy = Math.min(stats.maxEnergy, state.energy + regen);

  render();
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

function initTabs() {
  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach((t) => t.classList.remove('active'));
      $$('.panel').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      $(`#panel-${tab.dataset.tab}`).classList.add('active');
      if (tab.dataset.tab === 'leaderboard') {
        renderLeaderboard();
        startLeaderboardLive();
      }
    });
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
    const passive = (stats.perHour / 3600) * offline;
    const regen = stats.energyRegen * offline;
    state.energy = Math.min(stats.maxEnergy, state.energy + regen);
    if (passive > 0) {
      state.balance += passive;
      state.totalEarned += passive;
    }
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
  initTap();
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
          const { save } = await res.json();
          applySaveData(save);
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
