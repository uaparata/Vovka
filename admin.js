let allPlayers = [];

function formatNum(n) {
  return Math.floor(n).toLocaleString('ru-RU');
}

function isSuspiciousBalance(p) {
  const earnedCap = Math.max(p.totalTaps * 500 + 10_000, 50_000);
  return (
    p.totalEarned > earnedCap * 3 ||
    p.balance > 5_000_000 ||
    p.totalEarned > 10_000_000 ||
    p.suspicious > 5
  );
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getFilteredPlayers() {
  const q = document.getElementById('search-input')?.value.trim().toLowerCase();
  if (!q) return allPlayers;
  return allPlayers.filter(
    (p) =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.nickname || '').toLowerCase().includes(q)
  );
}

function renderPlayers() {
  const players = getFilteredPlayers();
  const body = document.getElementById('players-body');
  body.innerHTML = '';

  for (const p of players) {
    const tr = document.createElement('tr');
    if (p.banned) tr.classList.add('banned-row');
    if (isSuspiciousBalance(p)) tr.classList.add('cheat-row');

    tr.innerHTML = `
      <td>
        <div class="player-cell">
          ${p.avatar ? `<img class="player-avatar" src="${escapeHtml(p.avatar)}" alt="">` : ''}
          <div>
            <div class="player-name">${escapeHtml(p.name)}</div>
            <div class="player-email">${escapeHtml(p.email)}</div>
            ${p.banned ? `<div class="ban-reason">${escapeHtml(p.banReason || 'Забанен')}</div>` : ''}
          </div>
        </div>
      </td>
      <td><strong>${formatNum(p.balance)}</strong> 💪</td>
      <td>${formatNum(p.totalEarned)} 💪</td>
      <td>${formatNum(p.totalTaps)}</td>
      <td>${p.maxLevel}</td>
      <td class="${p.suspicious > 0 ? 'suspicious' : ''}">${p.suspicious || '—'}</td>
      <td>
        <div class="actions" data-id="${p.id}">
          ${p.banned
            ? '<button class="btn btn-unban" data-action="unban">Разбан</button>'
            : '<button class="btn btn-ban" data-action="ban">Бан</button>'}
          <button class="btn btn-coins" data-action="add1k">+1K</button>
          <button class="btn btn-coins" data-action="sub1k">-1K</button>
          <button class="btn btn-coins" data-action="add10k">+10K</button>
          <button class="btn btn-coins" data-action="set">Баланс</button>
          <button class="btn btn-coins" data-action="setEarned">Заработано</button>
          <button class="btn btn-reset" data-action="reset">Сброс</button>
        </div>
      </td>
    `;
    body.appendChild(tr);
  }

  body.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => handleAction(btn));
  });
}

async function adminPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    alert(data.error || 'Ошибка');
    return false;
  }
  return true;
}

async function handleAction(btn) {
  const id = Number(btn.closest('.actions').dataset.id);
  const action = btn.dataset.action;

  if (action === 'ban') {
    const reason = prompt('Причина бана:', 'Читы / накрутка зинкоинов');
    if (reason === null) return;
    await adminPost('/api/admin/ban', { userId: id, reason });
  } else if (action === 'unban') {
    await adminPost('/api/admin/unban', { userId: id });
  } else if (action === 'add1k') {
    await adminPost('/api/admin/adjust-balance', { userId: id, delta: 1000 });
  } else if (action === 'sub1k') {
    await adminPost('/api/admin/adjust-balance', { userId: id, delta: -1000 });
  } else if (action === 'add10k') {
    await adminPost('/api/admin/adjust-balance', { userId: id, delta: 10_000 });
  } else if (action === 'set') {
    const val = prompt('Новый баланс (текущие зинкоины):');
    if (val === null) return;
    await adminPost('/api/admin/adjust-balance', { userId: id, set: Number(val) });
  } else if (action === 'setEarned') {
    const val = prompt('Всего заработано (для рейтинга):');
    if (val === null) return;
    await adminPost('/api/admin/adjust-balance', { userId: id, setEarned: Number(val) });
  } else if (action === 'reset') {
    if (!confirm('Сбросить прогресс игрока (баланс, улучшения, заработано)?')) return;
    await adminPost('/api/admin/reset', { userId: id });
  }

  loadPlayers();
}

async function loadPlayers() {
  const res = await fetch('/api/admin/players', { credentials: 'include' });
  if (!res.ok) {
    window.location.href = '/';
    return;
  }
  const { players } = await res.json();
  allPlayers = players;

  document.getElementById('player-count').textContent = players.length;
  document.getElementById('banned-count').textContent = players.filter((p) => p.banned).length;
  document.getElementById('suspicious-count').textContent = players.filter(
    (p) => isSuspiciousBalance(p) || p.suspicious > 0
  ).length;

  renderPlayers();
}

document.getElementById('search-input')?.addEventListener('input', renderPlayers);
document.getElementById('refresh-btn')?.addEventListener('click', loadPlayers);

loadPlayers();
setInterval(loadPlayers, 15000);
