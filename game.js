const STORAGE_KEY = 'fauckzini_save';

const PHOTO_LEVELS = [
  { level: 1, min: 0, max: 10_000, image: 'assets/level-1.png', name: 'Новичок' },
  { level: 2, min: 10_000, max: 100_000, image: 'assets/level-2.png', name: 'Уличный' },
  { level: 3, min: 100_000, max: 500_000, image: 'assets/level-3.png', name: 'Стиляга' },
  { level: 4, min: 500_000, max: 1_000_000, image: 'assets/level-4.png', name: 'Босс' },
  { level: 5, min: 1_000_000, max: 5_000_000, image: 'assets/level-5.png', name: 'Легенда' },
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
    desc: '+10 зинкоинов в час',
    basePrice: 500,
    priceMult: 1.65,
    maxLevel: 25,
    effect: (lvl) => ({ perHour: lvl * 10 }),
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
    desc: '+50 к макс. энергии',
    basePrice: 800,
    priceMult: 1.8,
    maxLevel: 20,
    effect: (lvl) => ({ maxEnergy: lvl * 50 }),
  },
  {
    id: 'ring',
    name: 'Кольцо силы',
    icon: '💍',
    desc: '×2 к пассивному доходу',
    basePrice: 2000,
    priceMult: 2.2,
    maxLevel: 8,
    effect: (lvl) => ({ hourMult: 1 + lvl }),
  },
  {
    id: 'jacket',
    name: 'Куртка на плече',
    icon: '🧥',
    desc: 'Энергия восстанавливается быстрее',
    basePrice: 1500,
    priceMult: 2,
    maxLevel: 15,
    effect: (lvl) => ({ energyRegen: lvl }),
  },
];

const defaultState = () => ({
  balance: 0,
  energy: 1000,
  totalTaps: 0,
  totalEarned: 0,
  maxLevel: 1,
  peakBalance: 0,
  upgradeLevels: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])),
  lastSave: Date.now(),
  lastPassive: Date.now(),
});

let state = loadLocalState();
let currentUser = null;
let saveTimeout = null;
let isSyncing = false;

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const loaded = { ...defaultState(), ...saved };
      loaded.peakBalance = Math.max(loaded.peakBalance || 0, loaded.balance, loaded.totalEarned);
      if (!saved.maxLevel) {
        loaded.maxLevel = levelFromBalance(loaded.peakBalance);
      }
      return loaded;
    }
  } catch (_) {}
  return defaultState();
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
    lastSave: state.lastSave,
  };
}

function applySaveData(data) {
  state = {
    ...defaultState(),
    balance: data.balance ?? 0,
    energy: data.energy ?? 1000,
    totalTaps: data.totalTaps ?? 0,
    totalEarned: data.totalEarned ?? 0,
    maxLevel: data.maxLevel ?? 1,
    peakBalance: data.peakBalance ?? 0,
    upgradeLevels: { ...defaultState().upgradeLevels, ...(data.upgradeLevels || {}) },
    lastPassive: data.lastPassive ?? Date.now(),
    lastSave: data.lastSave ?? Date.now(),
  };
  syncMaxLevel();
}

let googleAuthReady = true;

function setSyncStatus(_status) {}

function saveState() {
  state.lastSave = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (currentUser) scheduleCloudSave();
  else setSyncStatus('local');
}

async function syncToServer() {
  if (!currentUser || isSyncing) return;
  isSyncing = true;
  setSyncStatus('pending');
  try {
    const res = await fetch('/api/save', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(getSavePayload()),
    });
    if (!res.ok) throw new Error('save failed');
    setSyncStatus('saved');
  } catch (_) {
    setSyncStatus('error');
  } finally {
    isSyncing = false;
  }
}

function scheduleCloudSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(syncToServer, 800);
}

function showGuestAuth() {
  $('#header-guest')?.classList.remove('hidden');
  $('#header-user')?.classList.add('hidden');
  $('#logout-btn')?.classList.add('hidden');
}

function showUserAuth(user) {
  $('#header-guest')?.classList.add('hidden');
  $('#header-user')?.classList.remove('hidden');
  if (user.avatar) {
    $('#user-avatar').src = user.avatar;
    $('#user-avatar').alt = user.name || '';
    $('#user-chip').title = user.name || user.email || 'Аккаунт';
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

async function loadCloudSave() {
  try {
    const res = await fetch('/api/save', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    const local = loadLocalState();

    if (data.save) {
      const useLocal =
        local.totalEarned > data.save.totalEarned ||
        (local.maxLevel || 1) > (data.save.maxLevel || 1);
      if (useLocal) {
        applySaveData(local);
        state.maxLevel = Math.max(local.maxLevel || 1, data.save.maxLevel || 1);
        state.peakBalance = Math.max(local.peakBalance || 0, data.save.peakBalance || 0);
        syncMaxLevel();
        await syncToServer();
      } else {
        applySaveData(data.save);
        state.maxLevel = Math.max(state.maxLevel || 1, local.maxLevel || 1);
        state.peakBalance = Math.max(state.peakBalance || 0, local.peakBalance || 0);
        syncMaxLevel();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } else if (local.totalEarned > 0) {
      applySaveData(local);
      await syncToServer();
    }
  } catch (_) {}
}

async function initAuth() {
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    if (res.ok) {
      currentUser = await res.json();
      showUserAuth(currentUser);
      await loadCloudSave();
      return;
    }
  } catch (_) {}
  showGuestAuth();
}

function initLogout() {
  $('#logout-btn')?.addEventListener('click', async () => {
    await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
    currentUser = null;
    showGuestAuth();
    window.location.href = '/';
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
  let maxEnergy = 1000;
  let tapMult = 1;
  let hourMult = 1;
  let energyRegen = 1;

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

function syncMaxLevel() {
  state.peakBalance = Math.max(
    state.peakBalance || 0,
    state.balance,
    state.totalEarned
  );
  const fromPeak = levelFromBalance(state.peakBalance);
  state.maxLevel = Math.max(state.maxLevel || 1, fromPeak);
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

function buyUpgrade(upgrade) {
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

function tap(e) {
  const stats = calcStats();
  if (state.energy < 1) return;

  state.energy -= 1;
  const earned = stats.perTap;
  state.balance += earned;
  state.totalTaps++;
  state.totalEarned += earned;

  const img = $('#vova');
  img.classList.remove('tap-anim');
  void img.offsetWidth;
  img.classList.add('tap-anim');

  const balanceEl = $('#balance');
  balanceEl.classList.remove('bump');
  void balanceEl.offsetWidth;
  balanceEl.classList.add('bump');

  const x = e.clientX ?? e.touches?.[0]?.clientX ?? 200;
  const y = e.clientY ?? e.touches?.[0]?.clientY ?? 300;
  spawnFloat(x, y, earned);

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

function initTabs() {
  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach((t) => t.classList.remove('active'));
      $$('.panel').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      $(`#panel-${tab.dataset.tab}`).classList.add('active');
    });
  });
}

function initTap() {
  const zone = $('#tap-zone');
  zone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    tap(e);
  });
}

function initOfflineProgress() {
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

async function boot() {
  handleAuthRedirect();
  initTabs();
  initTap();
  initLogin();
  initLogout();
  await checkAuthConfig();
  await initAuth();
  syncMaxLevel();
  initOfflineProgress();
  render();

  setInterval(() => {
    applyPassive();
    saveState();
  }, 1000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveState();
      if (currentUser) syncToServer();
    }
  });
}

boot();
