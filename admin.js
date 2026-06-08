function formatNum(n) {
  return Math.floor(n).toLocaleString('ru-RU');
}

async function loadPlayers() {
  const res = await fetch('/api/admin/players', { credentials: 'include' });
  if (!res.ok) {
    window.location.href = '/';
    return;
  }
  const { players } = await res.json();
  const body = document.getElementById('players-body');
  body.innerHTML = '';

  document.getElementById('player-count').textContent = players.length;
  document.getElementById('banned-count').textContent = players.filter((p) => p.banned).length;

  for (const p of players) {
    const tr = document.createElement('tr');
    if (p.banned) tr.className = 'banned-row';
    tr.innerHTML = `
      <td>
        <div class="player-cell">
          ${p.avatar ? `<img class="player-avatar" src="${p.avatar}" alt="">` : ''}
          <div>
            <div class="player-name">${p.name}</div>
            <div class="player-email">${p.email}</div>
          </div>
        </div>
      </td>
      <td><strong>${formatNum(p.balance)}</strong> 💪</td>
      <td>${p.maxLevel}</td>
      <td class="${p.suspicious > 0 ? 'suspicious' : ''}">${p.suspicious || '—'}</td>
      <td>
        <div class="actions" data-id="${p.id}">
          ${p.banned
            ? '<button class="btn btn-unban" data-action="unban">Разбан</button>'
            : '<button class="btn btn-ban" data-action="ban">Бан</button>'}
          <button class="btn btn-coins" data-action="add1k">+1K</button>
          <button class="btn btn-coins" data-action="sub1k">-1K</button>
          <button class="btn btn-coins" data-action="set">=</button>
        </div>
      </td>
    `;
    body.appendChild(tr);
  }

  body.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.closest('.actions').dataset.id);
      const action = btn.dataset.action;

      if (action === 'ban') {
        const reason = prompt('Причина бана:', 'Читы / автокликер');
        if (reason === null) return;
        await fetch('/api/admin/ban', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId: id, reason }),
        });
      } else if (action === 'unban') {
        await fetch('/api/admin/unban', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId: id }),
        });
      } else if (action === 'add1k') {
        await fetch('/api/admin/adjust-balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId: id, delta: 1000 }),
        });
      } else if (action === 'sub1k') {
        await fetch('/api/admin/adjust-balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId: id, delta: -1000 }),
        });
      } else if (action === 'set') {
        const val = prompt('Новый баланс:');
        if (val === null) return;
        await fetch('/api/admin/adjust-balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId: id, set: Number(val) }),
        });
      }
      loadPlayers();
    });
  });
}

loadPlayers();
