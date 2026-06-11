'use strict';
const express = require('express');
const router  = express.Router();
const { pool } = require('../db');

const ADMIN_KEY = process.env.ADMIN_KEY || '';

// In-memory лічильник подій
let _activityCounter = 0;
let _activityLastAt  = 0;
function bumpActivity() {
  _activityCounter++;
  _activityLastAt = Date.now();
}

function auth(req, res, next) {
  const key = req.query.key || req.headers['x-admin-key'];
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
}

// GET /admin — HTML-панель
router.get('/', (req, res) => {
  const key = req.query.key || '';
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Admin</title>
    <style>body{background:#0a0a0f;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
    form{display:flex;flex-direction:column;gap:12px;width:280px}
    input{padding:10px;border-radius:8px;border:1px solid #333;background:#1a1a2e;color:#fff;font-size:16px}
    button{padding:12px;border-radius:8px;border:none;background:linear-gradient(135deg,#7b2fff,#ff6b9d);color:#fff;font-size:16px;cursor:pointer}
    </style></head><body>
    <form method="GET" action="/admin">
      <h2 style="text-align:center;margin:0">🔮 Admin</h2>
      <input type="password" name="key" placeholder="Admin Key" required>
      <button type="submit">Войти</button>
    </form></body></html>`);
  }

  res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>🔮 Tarot Bot — Admin</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#07030f;color:#e0d8ff;font-family:'Inter',sans-serif;min-height:100vh}
  .header{background:linear-gradient(135deg,#1a0a2e,#0d0520);padding:16px 24px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #2a1a4a;flex-wrap:wrap;gap:8px}
  .header h1{font-size:20px;font-weight:700;color:#c9a0ff}
  .header-right{margin-left:auto;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .header span.ts{font-size:12px;color:#8a7aaa}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;padding:20px 24px}
  .card{background:#120824;border:1px solid #2a1a4a;border-radius:14px;padding:16px;transition:.2s}
  .card:hover{border-color:#7b2fff}
  .card-icon{font-size:26px;margin-bottom:6px}
  .card-val{font-size:30px;font-weight:700;color:#c9a0ff;margin:2px 0}
  .card-label{font-size:12px;color:#8a7aaa}
  .section{padding:0 24px 28px}
  .section h2{font-size:16px;color:#c9a0ff;margin-bottom:12px;padding-top:4px;display:flex;align-items:center;gap:8px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#1a0a2e;padding:9px 10px;text-align:left;color:#8a7aaa;border-bottom:1px solid #2a1a4a;white-space:nowrap}
  td{padding:9px 10px;border-bottom:1px solid #140a20;color:#c0b8d8;vertical-align:middle}
  tr.user-row{cursor:pointer;transition:background .12s}
  tr.user-row:hover td{background:#180e2a}
  .badge{display:inline-block;padding:2px 7px;border-radius:20px;font-size:11px;font-weight:600}
  .badge-premium{background:#3d1f8a;color:#c9a0ff}
  .badge-free{background:#1a2a1a;color:#6ac96a}
  .badge-pay{background:#1a2a10;color:#8ae86a}
  .badge-spread{background:#1a2a3a;color:#6ab4e8;font-size:10px}
  .btn{background:linear-gradient(135deg,#7b2fff,#9b4fff);border:none;color:#fff;padding:7px 16px;border-radius:8px;cursor:pointer;font-size:13px;white-space:nowrap}
  .btn-danger{background:#8a1a1a}
  .btn-sm{padding:5px 12px;font-size:12px}
  .actions{display:flex;gap:8px;align-items:center;padding:0 24px 12px;flex-wrap:wrap}
  .search{background:#120824;border:1px solid #2a1a4a;color:#e0d8ff;padding:7px 12px;border-radius:8px;font-size:13px;width:200px}
  .grant-form{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .grant-form input{background:#120824;border:1px solid #2a1a4a;color:#e0d8ff;padding:7px 10px;border-radius:8px;font-size:13px;width:130px}
  .grant-form select{background:#120824;border:1px solid #2a1a4a;color:#e0d8ff;padding:7px 10px;border-radius:8px;font-size:13px}
  #msg{padding:8px 16px;border-radius:8px;font-size:13px;display:none;margin:0 24px 8px}
  .msg-ok{background:#1a3a1a;color:#6ac96a}
  .msg-err{background:#3a1a1a;color:#e96a6a}
  .tg-link{color:#6ab4e8;text-decoration:none;font-size:12px}
  .tg-link:hover{text-decoration:underline}
  .uid-cell{font-family:monospace;font-size:12px;color:#8a7aaa}

  /* ── Модал юзера ── */
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow-y:auto}
  .modal-overlay.hidden{display:none}
  .modal-box{background:#0f0620;border:1px solid #3a1a5a;border-radius:20px;width:100%;max-width:680px;padding:24px;position:relative}
  .modal-close{position:absolute;top:14px;right:14px;background:none;border:none;color:#8a7aaa;font-size:22px;cursor:pointer;line-height:1}
  .modal-close:hover{color:#fff}
  .modal-header{display:flex;align-items:center;gap:14px;margin-bottom:20px}
  .modal-avatar{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#7b2fff,#ff6b9d);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;flex-shrink:0}
  .modal-name{font-size:18px;font-weight:700;color:#c9a0ff}
  .modal-meta{font-size:12px;color:#8a7aaa;margin-top:2px}
  .modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
  .modal-stat{background:#1a0a2e;border-radius:10px;padding:10px 14px}
  .modal-stat-val{font-size:18px;font-weight:700;color:#e0d8ff}
  .modal-stat-label{font-size:11px;color:#6a5a8a;margin-top:2px}
  .modal-section-title{font-size:13px;font-weight:600;color:#8a7aaa;text-transform:uppercase;letter-spacing:.5px;margin:16px 0 8px}
  .reading-row{padding:8px 12px;background:#120824;border-radius:10px;margin-bottom:6px;display:flex;align-items:center;gap:10px}
  .reading-row-type{font-size:11px;font-weight:600;background:#1a2a3a;color:#6ab4e8;padding:2px 7px;border-radius:8px;flex-shrink:0}
  .reading-row-date{font-size:11px;color:#4a3a6a;margin-left:auto;flex-shrink:0}
  .reading-cards{font-size:12px;color:#9a8ab8;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .modal-actions{display:flex;gap:8px;margin-top:20px;flex-wrap:wrap}
  .modal-actions input{background:#1a0a2e;border:1px solid #3a1a5a;color:#e0d8ff;padding:7px 10px;border-radius:8px;font-size:13px;width:100px}
  .modal-actions select{background:#1a0a2e;border:1px solid #3a1a5a;color:#e0d8ff;padding:7px 10px;border-radius:8px;font-size:13px}
  .empty-state{color:#4a3a6a;font-size:13px;padding:12px;text-align:center}
</style>
</head>
<body>
<div class="header">
  <span>🔮</span>
  <h1>Tarot Bot — Admin</h1>
  <div class="header-right">
    <span class="ts" id="last-updated">Загрузка...</span>
    <button class="btn" onclick="loadAll()">↻ Обновить</button>
  </div>
</div>

<div class="grid" id="stats-grid">
  <div class="card"><div class="card-icon">👤</div><div class="card-val" id="s-users">—</div><div class="card-label">Всего пользователей</div></div>
  <div class="card"><div class="card-icon">👑</div><div class="card-val" id="s-premium">—</div><div class="card-label">Активный премиум</div></div>
  <div class="card"><div class="card-icon">🌱</div><div class="card-val" id="s-new7">—</div><div class="card-label">Новых за 7 дней</div></div>
  <div class="card"><div class="card-icon">📊</div><div class="card-val" id="s-new30">—</div><div class="card-label">Новых за 30 дней</div></div>
  <div class="card"><div class="card-icon">⭐</div><div class="card-val" id="s-stars">—</div><div class="card-label">Всего Stars</div></div>
  <div class="card"><div class="card-icon">💳</div><div class="card-val" id="s-pays">—</div><div class="card-label">Платежей</div></div>
  <div class="card"><div class="card-icon">🃏</div><div class="card-val" id="s-reads">—</div><div class="card-label">Раскладов</div></div>
  <div class="card"><div class="card-icon">🕯️</div><div class="card-val" id="s-spells">—</div><div class="card-label">Заговоров куплено</div></div>
</div>

<div id="msg"></div>

<!-- Видать премиум вручную -->
<div class="section">
  <h2>⚡ Выдать премиум вручную</h2>
  <div class="grant-form">
    <input id="grant-uid" placeholder="User ID" type="text">
    <select id="grant-days">
      <option value="1">1 день</option>
      <option value="7">7 дней</option>
      <option value="30" selected>30 дней</option>
      <option value="90">90 дней</option>
      <option value="365">365 дней</option>
    </select>
    <button class="btn" onclick="grantPremium()">Выдать 👑</button>
  </div>
</div>

<!-- Live Activity Feed — без daily карт -->
<div class="section">
  <h2>⚡ Активность <span id="activity-dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#6ac96a;margin-left:4px;vertical-align:middle"></span></h2>
  <div id="activity-feed" style="display:flex;flex-direction:column;gap:5px;max-height:280px;overflow-y:auto"></div>
</div>

<!-- Платежи -->
<div class="section">
  <h2>💳 Последние платежи</h2>
  <table id="payments-table">
    <thead><tr><th>Дата</th><th>User</th><th>Имя</th><th>Тип</th><th>Stars</th></tr></thead>
    <tbody></tbody>
  </table>
</div>

<!-- Пользователи -->
<div class="section">
  <h2>👤 Пользователи <span id="users-count" style="font-size:12px;color:#4a3a6a;font-weight:400"></span></h2>
  <div class="actions">
    <input class="search" id="search-input" placeholder="Поиск: имя / ID / знак..." oninput="filterUsers()">
    <select id="filter-premium" onchange="filterUsers()" style="background:#120824;border:1px solid #2a1a4a;color:#e0d8ff;padding:7px 10px;border-radius:8px;font-size:13px">
      <option value="">Все</option>
      <option value="premium">Только Premium</option>
      <option value="free">Только Free</option>
    </select>
  </div>
  <table id="users-table">
    <thead>
      <tr>
        <th>User ID</th>
        <th>Имя</th>
        <th>Знак / ДР</th>
        <th>Статус</th>
        <th>Расклады</th>
        <th>Рефералы</th>
        <th>Последнее действие</th>
        <th>Зарег.</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>
</div>

<!-- Модал деталей юзера -->
<div class="modal-overlay hidden" id="user-modal" onclick="closeModal(event)">
  <div class="modal-box" id="user-modal-box">
    <button class="modal-close" onclick="closeUserModal()">✕</button>
    <div id="user-modal-content"><div class="empty-state">Загрузка...</div></div>
  </div>
</div>

<script>
const KEY = '${key}';
let allUsers = [];
let allUsersExtra = {};

async function apiFetch(url, opts) {
  const r = await fetch(url + (url.includes('?') ? '&' : '?') + 'key=' + KEY, opts);
  return r.json();
}

const EVENT_ICONS  = { register:'🌟', reading:'🃏', payment:'⭐', spell:'🕯️', ai_chat:'✨' };
const SPREAD_NAMES = { three_card:'3 карты', love:'Любовь', month:'Месяц', year:'Год', daily:'Карта дня' };
let _lastActivityId = 0;

async function loadActivity() {
  const data = await apiFetch('/admin/api/activity');
  if (!data.ok) return;
  const feed = document.getElementById('activity-feed');
  if (!feed) return;

  const newItems = data.events.filter(e => e.id > _lastActivityId);
  if (newItems.length > 0) {
    _lastActivityId = data.events[0]?.id || _lastActivityId;
    const dot = document.getElementById('activity-dot');
    if (dot) { dot.style.background = '#f0c040'; setTimeout(() => dot.style.background = '#6ac96a', 800); }
  }

  feed.innerHTML = data.events.length ? data.events.map(e => {
    const spreadLabel = SPREAD_NAMES[e.meta] || e.meta || '';
    const color = e.event_type==='register' ? '#c9a0ff' : e.event_type==='payment' ? '#f0c040' : e.event_type==='spell' ? '#ff9d4a' : '#4a7aff';
    const name = e.first_name ? \`<span style="color:#9a8ab8;font-size:12px"> · \${e.first_name}</span>\` : '';
    return \`<div style="display:flex;align-items:center;gap:10px;padding:7px 12px;background:#120824;border-radius:10px;border-left:3px solid \${color};cursor:\${e.user_id?'pointer':'default'}"
            onclick="\${e.user_id ? \`openUserModal('\${e.user_id}')\` : ''}">
      <span style="font-size:16px">\${EVENT_ICONS[e.event_type]||'•'}</span>
      <div style="flex:1;min-width:0">
        <span style="font-size:13px;color:#c0b8d8">\${e.event_type==='payment' ? 'Оплата ⭐ '+(e.stars||'') : e.event_type==='register' ? 'Новый юзер' : e.event_type==='spell' ? 'Заговор' : e.event_type==='ai_chat' ? 'AI Оракул' : 'Расклад'}</span>
        \${spreadLabel && e.event_type==='reading' ? \`<span class="badge badge-spread">\${spreadLabel}</span>\` : ''}
        \${name}
      </div>
      <span style="font-size:11px;color:#4a3a6a;flex-shrink:0">\${timeSince(e.created_at)}</span>
    </div>\`;
  }).join('') : '<div class="empty-state">Активности пока нет</div>';
}

function timeSince(dateStr) {
  const sec = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (sec < 60) return sec + 'с';
  if (sec < 3600) return Math.floor(sec/60) + 'м';
  if (sec < 86400) return Math.floor(sec/3600) + 'ч';
  return Math.floor(sec/86400) + 'д';
}

async function loadAll() {
  document.getElementById('last-updated').textContent = 'Загрузка...';
  const [stats, users, pays] = await Promise.all([
    apiFetch('/admin/api/stats'),
    apiFetch('/admin/api/users'),
    apiFetch('/admin/api/payments'),
  ]);

  if (stats.ok) {
    document.getElementById('s-users').textContent  = stats.users;
    document.getElementById('s-premium').textContent = stats.premium;
    document.getElementById('s-new7').textContent   = stats.new7;
    document.getElementById('s-new30').textContent  = stats.new30;
    document.getElementById('s-stars').textContent  = '⭐ ' + (stats.totalStars || 0);
    document.getElementById('s-pays').textContent   = stats.totalPayments || 0;
    document.getElementById('s-reads').textContent  = stats.readings || 0;
    document.getElementById('s-spells').textContent = stats.spellsPurchased || 0;
  }

  if (users.ok) {
    allUsers = users.users;
    allUsersExtra = {};
    users.users.forEach(u => { allUsersExtra[u.user_id] = u; });
    renderUsers(allUsers);
    document.getElementById('users-count').textContent = '(' + allUsers.length + ')';
  }

  if (pays.ok) {
    const tbody = document.querySelector('#payments-table tbody');
    tbody.innerHTML = pays.payments.map(p => \`
      <tr style="cursor:pointer" onclick="openUserModal('\${p.user_id}')">
        <td>\${new Date(p.created_at).toLocaleString('ru-RU')}</td>
        <td class="uid-cell">\${p.user_id}</td>
        <td>\${p.first_name || '—'} \${p.username ? '<a class="tg-link" href="https://t.me/'+p.username+'" target="_blank">@'+p.username+'</a>' : ''}</td>
        <td><span class="badge badge-pay">\${p.payload}</span></td>
        <td>⭐ \${p.stars}</td>
      </tr>
    \`).join('');
  }

  await loadActivity();
  document.getElementById('last-updated').textContent = 'Обновлено: ' + new Date().toLocaleTimeString('ru-RU');
}

const ZODIAC_SIGNS = {
  Овен:'♈',Телец:'♉',Близнецы:'♊',Рак:'♋',Лев:'♌',Дева:'♍',
  Весы:'♎',Скорпион:'♏',Стрелец:'♐',Козерог:'♑',Водолей:'♒',Рыбы:'♓',
};

function renderUsers(users) {
  const tbody = document.querySelector('#users-table tbody');
  tbody.innerHTML = users.map(u => {
    const isPrem = u.is_premium && u.premium_expiry && Date.now() < Number(u.premium_expiry);
    const daysLeft = isPrem ? Math.ceil((Number(u.premium_expiry) - Date.now()) / 86400000) : 0;
    const zodiacEmoji = u.zodiac ? (ZODIAC_SIGNS[u.zodiac] || '') : '';
    const lastAction = u.last_action_at ? timeSince(u.last_action_at) + ' назад' : '—';
    const lastActionLabel = u.last_action_type ? \`<span class="badge badge-spread">\${SPREAD_NAMES[u.last_action_type]||u.last_action_type}</span>\` : '';
    const tgLink = u.username ? \`<a class="tg-link" href="https://t.me/\${u.username}" target="_blank" onclick="event.stopPropagation()">@\${u.username}</a>\` : '';
    return \`<tr class="user-row" onclick="openUserModal('\${u.user_id}')">
      <td class="uid-cell">\${u.user_id}<br>\${tgLink}</td>
      <td>\${u.first_name || '—'}</td>
      <td>\${zodiacEmoji} \${u.zodiac||''}<br><span style="font-size:11px;color:#4a3a6a">\${u.birth_date||'—'}</span></td>
      <td>\${isPrem ? \`<span class="badge badge-premium">👑 \${daysLeft}д</span>\` : '<span class="badge badge-free">free</span>'}</td>
      <td style="text-align:center">\${u.reading_count||0}</td>
      <td style="text-align:center">\${u.ref_bonus||0}</td>
      <td>\${lastActionLabel} \${lastAction}</td>
      <td style="font-size:11px">\${new Date(u.created_at).toLocaleDateString('ru-RU')}</td>
    </tr>\`;
  }).join('');
}

function filterUsers() {
  const q    = document.getElementById('search-input').value.toLowerCase();
  const prem = document.getElementById('filter-premium').value;
  let filtered = allUsers.filter(u => {
    const matchQ = !q || (u.first_name||'').toLowerCase().includes(q) ||
                   String(u.user_id).includes(q) ||
                   (u.username||'').toLowerCase().includes(q) ||
                   (u.zodiac||'').toLowerCase().includes(q);
    const isPrem = u.is_premium && u.premium_expiry && Date.now() < Number(u.premium_expiry);
    const matchP = !prem || (prem==='premium' && isPrem) || (prem==='free' && !isPrem);
    return matchQ && matchP;
  });
  renderUsers(filtered);
}

// ── Модал деталей юзера ────────────────────────────────────────────────────
async function openUserModal(userId) {
  const modal = document.getElementById('user-modal');
  const content = document.getElementById('user-modal-content');
  modal.classList.remove('hidden');
  content.innerHTML = '<div class="empty-state">Загрузка...</div>';

  const data = await apiFetch('/admin/api/users/' + userId);
  if (!data.ok) { content.innerHTML = '<div class="empty-state">Ошибка загрузки</div>'; return; }

  const u = data.user;
  const isPrem = u.is_premium && u.premium_expiry && Date.now() < Number(u.premium_expiry);
  const daysLeft = isPrem ? Math.ceil((Number(u.premium_expiry) - Date.now()) / 86400000) : 0;
  const letter = (u.first_name || u.user_id || '?')[0].toUpperCase();
  const zodiacEmoji = u.zodiac ? (ZODIAC_SIGNS[u.zodiac] || '') : '';
  const tgLink = u.username
    ? \`<a class="tg-link" href="https://t.me/\${u.username}" target="_blank">@\${u.username} ↗</a>\`
    : \`<span class="uid-cell">\${u.user_id}</span>\`;

  const readingsHtml = (data.readings||[]).map(r => {
    const cards = (r.cards||[]).map(c => c.nameRu||c.name).join(', ');
    return \`<div class="reading-row">
      <span class="reading-row-type">\${SPREAD_NAMES[r.spread_type]||r.spread_type}</span>
      <span class="reading-cards">\${cards}</span>
      <span class="reading-row-date">\${new Date(r.created_at).toLocaleDateString('ru-RU')}</span>
    </div>\`;
  }).join('') || '<div class="empty-state">Раскладов нет</div>';

  const paymentsHtml = (data.payments||[]).map(p =>
    \`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1a0a2e;font-size:13px">
      <span>\${p.payload}</span><span style="color:#f0c040">⭐ \${p.stars}</span>
      <span style="color:#4a3a6a;font-size:11px">\${new Date(p.created_at).toLocaleDateString('ru-RU')}</span>
    </div>\`
  ).join('') || '<div class="empty-state">Платежей нет</div>';

  content.innerHTML = \`
    <div class="modal-header">
      <div class="modal-avatar">\${letter}</div>
      <div>
        <div class="modal-name">\${u.first_name || 'Без имени'}</div>
        <div class="modal-meta">\${tgLink} · \${zodiacEmoji} \${u.zodiac||''} · ДР: \${u.birth_date||'не указана'}</div>
        <div class="modal-meta" style="margin-top:2px">Язык: \${u.lang||'ru'} · Зарег: \${new Date(u.created_at).toLocaleDateString('ru-RU')}</div>
      </div>
    </div>

    <div class="modal-grid">
      <div class="modal-stat"><div class="modal-stat-val">\${isPrem ? '👑 ' + daysLeft + ' дн.' : 'Free'}</div><div class="modal-stat-label">Премиум</div></div>
      <div class="modal-stat"><div class="modal-stat-val">\${data.readings?.length||0}</div><div class="modal-stat-label">Раскладов</div></div>
      <div class="modal-stat"><div class="modal-stat-val">\${data.payments?.length||0}</div><div class="modal-stat-label">Платежей</div></div>
      <div class="modal-stat"><div class="modal-stat-val">\${u.ref_bonus||0}</div><div class="modal-stat-label">Рефералов</div></div>
    </div>

    <div class="modal-section-title">Последние расклады</div>
    \${readingsHtml}

    <div class="modal-section-title">Платежи</div>
    \${paymentsHtml}

    <div class="modal-section-title">Управление</div>
    <div class="modal-actions">
      <input id="modal-grant-days" type="number" value="30" min="1" max="365" placeholder="Дней" style="width:80px">
      <button class="btn btn-sm" onclick="modalGrant('\${u.user_id}')">Выдать Premium 👑</button>
      <button class="btn btn-sm btn-danger" onclick="modalDelete('\${u.user_id}', '\${u.first_name||u.user_id}')">Удалить 🗑️</button>
    </div>
  \`;
}

function closeUserModal() { document.getElementById('user-modal').classList.add('hidden'); }
function closeModal(e) { if (e.target === document.getElementById('user-modal')) closeUserModal(); }

async function modalGrant(uid) {
  const days = document.getElementById('modal-grant-days').value;
  const r = await apiFetch('/admin/api/grant-premium', {
    method: 'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ userId: uid, days: Number(days) })
  });
  showMsg(r.ok ? \`✅ Premium \${days}д → \${uid}\` : '❌ ' + r.error, r.ok);
  if (r.ok) { openUserModal(uid); loadAll(); }
}

async function modalDelete(uid, name) {
  if (!confirm(\`Удалить \${name} (\${uid}) и все данные?\`)) return;
  const r = await apiFetch('/admin/api/delete-user', {
    method: 'DELETE', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ userId: uid })
  });
  showMsg(r.ok ? \`✅ \${name} удалён\` : '❌ ' + r.error, r.ok);
  if (r.ok) { closeUserModal(); loadAll(); }
}

async function grantPremium() {
  const uid  = document.getElementById('grant-uid').value.trim();
  const days = document.getElementById('grant-days').value;
  if (!uid) { showMsg('Введите User ID', false); return; }
  const r = await apiFetch('/admin/api/grant-premium', {
    method: 'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ userId: uid, days: Number(days) })
  });
  showMsg(r.ok ? \`✅ Премиум \${days}д → \${uid}\` : '❌ ' + r.error, r.ok);
  if (r.ok) { document.getElementById('grant-uid').value = ''; loadAll(); }
}

function showMsg(text, ok) {
  const el = document.getElementById('msg');
  el.textContent = text; el.className = ok ? 'msg-ok' : 'msg-err';
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 4000);
}

let _lastKnownCounter = -1;
async function checkPing() {
  try {
    const data = await apiFetch('/admin/api/ping');
    if (!data.ok) return;
    if (data.counter !== _lastKnownCounter) {
      _lastKnownCounter = data.counter;
      await loadActivity();
    }
  } catch (_) {}
}

loadAll();
setInterval(checkPing, 30000);
setInterval(loadAll, 86400000);
</script>
</body>
</html>`);
});

// GET /admin/api/stats
router.get('/api/stats', auth, async (req, res) => {
  try {
    const [users, premium, new7, new30, stars, pays, reads, spells] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users`),
      pool.query(`SELECT COUNT(*) FROM users WHERE is_premium=true AND premium_expiry > $1`, [Date.now()]),
      pool.query(`SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days'`),
      pool.query(`SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days'`),
      pool.query(`SELECT COALESCE(SUM(stars),0) as total FROM payments_log WHERE status='success'`),
      pool.query(`SELECT COUNT(*) FROM payments_log WHERE status='success'`),
      pool.query(`SELECT COUNT(*) FROM readings`),
      pool.query(`SELECT COUNT(*) FROM spell_purchases`),
    ]);
    res.json({
      ok: true,
      users:           Number(users.rows[0].count),
      premium:         Number(premium.rows[0].count),
      new7:            Number(new7.rows[0].count),
      new30:           Number(new30.rows[0].count),
      totalStars:      Number(stars.rows[0].total),
      totalPayments:   Number(pays.rows[0].count),
      readings:        Number(reads.rows[0].count),
      spellsPurchased: Number(spells.rows[0].count),
    });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /admin/api/users — список з агрегатами
router.get('/api/users', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        u.user_id, u.first_name, u.username, u.birth_date, u.lang,
        u.is_premium, u.premium_expiry, u.ref_bonus, u.created_at,
        -- знак зодіаку з мета розкладу
        (SELECT r.meta->'zodiac'->>'name' FROM readings r WHERE r.user_id=u.user_id LIMIT 1) as zodiac_json,
        -- кількість розкладів
        (SELECT COUNT(*) FROM readings r WHERE r.user_id=u.user_id)::int as reading_count,
        -- остання дія (не daily)
        (SELECT al.created_at FROM activity_log al WHERE al.user_id=u.user_id AND NOT (al.event_type='reading' AND al.meta='daily') ORDER BY al.created_at DESC LIMIT 1) as last_action_at,
        (SELECT al.meta FROM activity_log al WHERE al.user_id=u.user_id AND NOT (al.event_type='reading' AND al.meta='daily') ORDER BY al.created_at DESC LIMIT 1) as last_action_type
      FROM users u
      ORDER BY u.created_at DESC
      LIMIT 500
    `);

    const users = rows.map(u => ({ ...u, zodiac: u.zodiac_json || null }));

    res.json({ ok: true, users });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /admin/api/users/:userId — детальна інфа про юзера
router.get('/api/users/:userId', auth, async (req, res) => {
  try {
    const uid = req.params.userId;
    const [userRes, readingsRes, paymentsRes] = await Promise.all([
      pool.query(`SELECT u.*, (SELECT r.meta->'zodiac'->>'name' FROM readings r WHERE r.user_id=u.user_id LIMIT 1) as zodiac_json FROM users u WHERE user_id=$1`, [uid]),
      pool.query(`SELECT id, spread_type, cards, created_at FROM readings WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20`, [uid]),
      pool.query(`SELECT payload, stars, created_at FROM payments_log WHERE user_id=$1 AND status='success' ORDER BY created_at DESC`, [uid]),
    ]);

    if (!userRes.rows.length) return res.status(404).json({ ok: false, error: 'User not found' });

    const u = userRes.rows[0];
    res.json({
      ok: true,
      user: { ...u, zodiac: u.zodiac_json || null },
      readings: readingsRes.rows,
      payments: paymentsRes.rows,
    });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /admin/api/ping
router.get('/api/ping', auth, (req, res) => {
  res.json({ ok: true, counter: _activityCounter, lastAt: _activityLastAt });
});

// GET /admin/api/activity — без daily карт (спам)
router.get('/api/activity', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, user_id, event_type, meta, NULL::int as stars, created_at,
             (SELECT first_name FROM users WHERE user_id=activity_log.user_id) as first_name
      FROM activity_log
      WHERE NOT (event_type='reading' AND meta='daily')
      UNION ALL
      SELECT p.id, p.user_id, 'payment' as event_type, p.payload as meta, p.stars, p.created_at,
             u.first_name
      FROM payments_log p LEFT JOIN users u ON u.user_id=p.user_id
      WHERE p.status='success'
      ORDER BY created_at DESC LIMIT 60
    `);
    res.json({ ok: true, events: rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /admin/api/payments
router.get('/api/payments', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, u.first_name, u.username FROM payments_log p
       LEFT JOIN users u ON u.user_id = p.user_id
       ORDER BY p.created_at DESC LIMIT 100`
    );
    res.json({ ok: true, payments: rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /admin/api/grant-premium
router.post('/api/grant-premium', auth, async (req, res) => {
  try {
    const { userId, days } = req.body;
    if (!userId || !days) return res.status(400).json({ ok: false, error: 'userId and days required' });
    const expiry = Date.now() + Number(days) * 86400000;
    await pool.query(
      `UPDATE users SET is_premium=true, premium_expiry=$2, updated_at=NOW() WHERE user_id=$1`,
      [String(userId), expiry]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// DELETE /admin/api/delete-user (GDPR)
router.delete('/api/delete-user', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });
    const uid = String(userId);
    await pool.query(`DELETE FROM diary_entries WHERE user_id=$1`, [uid]);
    await pool.query(`DELETE FROM spell_purchases WHERE user_id=$1`, [uid]);
    await pool.query(`DELETE FROM readings WHERE user_id=$1`, [uid]);
    await pool.query(`DELETE FROM support_messages WHERE user_id=$1`, [uid]);
    await pool.query(`DELETE FROM payments_log WHERE user_id=$1`, [uid]);
    await pool.query(`DELETE FROM tg_msg_map WHERE user_id=$1`, [uid]);
    await pool.query(`DELETE FROM activity_log WHERE user_id=$1`, [uid]);
    await pool.query(`DELETE FROM users WHERE user_id=$1`, [uid]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
module.exports.bumpActivity = bumpActivity;
