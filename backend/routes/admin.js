'use strict';
const express = require('express');
const router  = express.Router();
const { pool } = require('../db');

const ADMIN_KEY = process.env.ADMIN_KEY || '';

// Middleware: перевіряємо ключ
function auth(req, res, next) {
  const key = req.query.key || req.headers['x-admin-key'];
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
}

// GET /admin — HTML-панель (захищена ключем в query ?key=...)
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
  .header{background:linear-gradient(135deg,#1a0a2e,#0d0520);padding:20px 32px;display:flex;align-items:center;gap:16px;border-bottom:1px solid #2a1a4a}
  .header h1{font-size:22px;font-weight:700;color:#c9a0ff}
  .header span{font-size:13px;color:#8a7aaa;margin-left:auto}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;padding:24px 32px}
  .card{background:#120824;border:1px solid #2a1a4a;border-radius:16px;padding:20px;transition:.2s}
  .card:hover{border-color:#7b2fff}
  .card-icon{font-size:32px;margin-bottom:8px}
  .card-val{font-size:36px;font-weight:700;color:#c9a0ff;margin:4px 0}
  .card-label{font-size:13px;color:#8a7aaa}
  .card-sub{font-size:12px;color:#6a5a8a;margin-top:4px}
  .section{padding:0 32px 32px}
  .section h2{font-size:18px;color:#c9a0ff;margin-bottom:16px;padding-top:8px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#1a0a2e;padding:10px 12px;text-align:left;color:#8a7aaa;border-bottom:1px solid #2a1a4a}
  td{padding:10px 12px;border-bottom:1px solid #1a0a2e;color:#c0b8d8}
  tr:hover td{background:#120824}
  .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
  .badge-premium{background:#3d1f8a;color:#c9a0ff}
  .badge-free{background:#1a2a1a;color:#6ac96a}
  .badge-pay{background:#1a2a10;color:#8ae86a}
  .btn-refresh{background:linear-gradient(135deg,#7b2fff,#ff6b9d);border:none;color:#fff;padding:8px 18px;border-radius:8px;cursor:pointer;font-size:13px}
  .actions{display:flex;gap:10px;align-items:center;padding:0 32px 16px;flex-wrap:wrap}
  .search{background:#120824;border:1px solid #2a1a4a;color:#e0d8ff;padding:8px 14px;border-radius:8px;font-size:13px;width:220px}
  .grant-form{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .grant-form input{background:#120824;border:1px solid #2a1a4a;color:#e0d8ff;padding:8px 12px;border-radius:8px;font-size:13px;width:140px}
  .grant-form select{background:#120824;border:1px solid #2a1a4a;color:#e0d8ff;padding:8px 12px;border-radius:8px;font-size:13px}
  .grant-form button{background:#7b2fff;border:none;color:#fff;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px}
  .chart-bar{height:8px;background:linear-gradient(90deg,#7b2fff,#ff6b9d);border-radius:4px;margin-top:4px}
  #msg{padding:8px 16px;border-radius:8px;font-size:13px;display:none;margin:0 32px 8px}
  .msg-ok{background:#1a3a1a;color:#6ac96a}
  .msg-err{background:#3a1a1a;color:#e96a6a}
</style>
</head>
<body>
<div class="header">
  <span>🔮</span>
  <h1>Tarot Bot — Admin</h1>
  <span id="last-updated">Загрузка...</span>
  <button class="btn-refresh" onclick="loadAll()">↻ Обновить</button>
</div>

<div class="grid" id="stats-grid">
  <div class="card"><div class="card-icon">👤</div><div class="card-val" id="s-users">—</div><div class="card-label">Всего пользователей</div></div>
  <div class="card"><div class="card-icon">👑</div><div class="card-val" id="s-premium">—</div><div class="card-label">Активный премиум</div></div>
  <div class="card"><div class="card-icon">🌱</div><div class="card-val" id="s-new7">—</div><div class="card-label">Новых за 7 дней</div></div>
  <div class="card"><div class="card-icon">📊</div><div class="card-val" id="s-new30">—</div><div class="card-label">Новых за 30 дней</div></div>
  <div class="card"><div class="card-icon">⭐</div><div class="card-val" id="s-stars">—</div><div class="card-label">Зарплачено Stars</div></div>
  <div class="card"><div class="card-icon">💳</div><div class="card-val" id="s-pays">—</div><div class="card-label">Платежей всего</div></div>
  <div class="card"><div class="card-icon">🃏</div><div class="card-val" id="s-reads">—</div><div class="card-label">Раскладов всего</div></div>
  <div class="card"><div class="card-icon">🕯️</div><div class="card-val" id="s-spells">—</div><div class="card-label">Заговоров куплено</div></div>
</div>

<div id="msg"></div>

<!-- Видати преміум вручну -->
<div class="section">
  <h2>⚡ Видать премиум вручную</h2>
  <div class="grant-form">
    <input id="grant-uid" placeholder="User ID (числа)" type="text">
    <select id="grant-days">
      <option value="30">30 дней</option>
      <option value="90">90 дней</option>
      <option value="365">365 дней</option>
    </select>
    <button onclick="grantPremium()">Выдать 👑</button>
    <input id="del-uid" placeholder="User ID для удаления" type="text">
    <button onclick="deleteUser()" style="background:#8a1a1a">Удалить юзера 🗑️</button>
  </div>
</div>

<!-- Live Activity Feed -->
<div class="section">
  <h2>⚡ Активность в реальном времени <span id="activity-dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#6ac96a;margin-left:6px;vertical-align:middle"></span></h2>
  <div id="activity-feed" style="display:flex;flex-direction:column;gap:6px;max-height:280px;overflow-y:auto"></div>
</div>

<!-- Платежи -->
<div class="section">
  <h2>💳 Последние платежи</h2>
  <table id="payments-table">
    <thead><tr><th>Дата</th><th>User ID</th><th>Имя</th><th>Тип</th><th>Stars</th></tr></thead>
    <tbody></tbody>
  </table>
</div>

<!-- Пользователи -->
<div class="section">
  <h2>👤 Пользователи</h2>
  <div class="actions">
    <input class="search" id="search-input" placeholder="Поиск по имени / ID..." oninput="filterUsers()">
  </div>
  <table id="users-table">
    <thead><tr><th>User ID</th><th>Имя</th><th>Дата рождения</th><th>Язык</th><th>Премиум</th><th>Рефералы</th><th>Зарегистрирован</th></tr></thead>
    <tbody></tbody>
  </table>
</div>

<script>
const KEY = '${key}';
let allUsers = [];

async function apiFetch(url) {
  const r = await fetch(url + (url.includes('?') ? '&' : '?') + 'key=' + KEY);
  return r.json();
}

const EVENT_ICONS = { register:'🌟', reading:'🃏', payment:'⭐', spell:'🕯️' };
const EVENT_LABELS = { register:'Новый юзер', reading:'Расклад', payment:'Оплата', spell:'Заговор' };
let _lastActivityId = 0;

async function loadActivity() {
  const data = await apiFetch('/admin/api/activity');
  if (!data.ok) return;
  const feed = document.getElementById('activity-feed');
  if (!feed) return;

  // Підсвічуємо нові події
  const newItems = data.events.filter(e => e.id > _lastActivityId);
  if (newItems.length > 0) {
    _lastActivityId = data.events[0]?.id || _lastActivityId;
    const dot = document.getElementById('activity-dot');
    if (dot) { dot.style.background = '#f0c040'; setTimeout(() => dot.style.background = '#6ac96a', 800); }
  }

  feed.innerHTML = data.events.length ? data.events.map(e => \`
    <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#120824;border-radius:10px;border-left:3px solid \${e.event_type==='register'?'#c9a0ff':e.event_type==='payment'?'#f0c040':'#4a7aff'}">
      <span style="font-size:18px">\${EVENT_ICONS[e.event_type]||'•'}</span>
      <div style="flex:1">
        <span style="font-size:13px;color:#c0b8d8">\${EVENT_LABELS[e.event_type]||e.event_type}</span>
        \${e.meta ? \`<span style="font-size:12px;color:#6a5a8a;margin-left:6px">\${e.meta}</span>\` : ''}
        \${e.event_type==='payment' ? \`<span style="font-size:12px;color:#f0c040;margin-left:6px">⭐ \${e.stars||''}</span>\` : ''}
      </div>
      <span style="font-size:11px;color:#4a3a6a">\${timeSince(e.created_at)}</span>
    </div>
  \`).join('') : '<div style="color:#4a3a6a;font-size:13px;padding:12px">Активности пока нет</div>';
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
    renderUsers(allUsers);
  }

  if (pays.ok) {
    const tbody = document.querySelector('#payments-table tbody');
    tbody.innerHTML = pays.payments.map(p => \`
      <tr>
        <td>\${new Date(p.created_at).toLocaleString('ru-RU')}</td>
        <td>\${p.user_id}</td>
        <td>\${p.first_name || '—'}</td>
        <td><span class="badge badge-pay">\${p.payload}</span></td>
        <td>⭐ \${p.stars}</td>
      </tr>
    \`).join('');
  }

  await loadActivity();
  document.getElementById('last-updated').textContent = 'Обновлено: ' + new Date().toLocaleTimeString('ru-RU');
}

function renderUsers(users) {
  const tbody = document.querySelector('#users-table tbody');
  tbody.innerHTML = users.map(u => {
    const isPrem = u.is_premium && u.premium_expiry && Date.now() < Number(u.premium_expiry);
    const daysLeft = isPrem ? Math.ceil((Number(u.premium_expiry) - Date.now()) / 86400000) : 0;
    return \`<tr>
      <td>\${u.user_id}</td>
      <td>\${u.first_name || '—'}</td>
      <td>\${u.birth_date || '—'}</td>
      <td>\${u.lang || 'ru'}</td>
      <td>\${isPrem ? \`<span class="badge badge-premium">👑 \${daysLeft}д</span>\` : '<span class="badge badge-free">free</span>'}</td>
      <td>\${u.ref_bonus || 0}</td>
      <td>\${new Date(u.created_at).toLocaleDateString('ru-RU')}</td>
    </tr>\`;
  }).join('');
}

function filterUsers() {
  const q = document.getElementById('search-input').value.toLowerCase();
  renderUsers(allUsers.filter(u =>
    (u.first_name || '').toLowerCase().includes(q) ||
    String(u.user_id).includes(q)
  ));
}

async function grantPremium() {
  const uid = document.getElementById('grant-uid').value.trim();
  const days = document.getElementById('grant-days').value;
  if (!uid) { showMsg('Введите User ID', false); return; }
  const r = await fetch(\`/admin/api/grant-premium?key=\${KEY}\`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ userId: uid, days: Number(days) })
  }).then(r => r.json());
  showMsg(r.ok ? \`✅ Премиум \${days}д выдан юзеру \${uid}\` : '❌ Ошибка: ' + r.error, r.ok);
  if (r.ok) loadAll();
}

async function deleteUser() {
  const uid = document.getElementById('del-uid').value.trim();
  if (!uid) { showMsg('Введите User ID для удаления', false); return; }
  if (!confirm(\`Удалить юзера \${uid} и все его данные?\`)) return;
  const r = await fetch(\`/admin/api/delete-user?key=\${KEY}\`, {
    method: 'DELETE',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ userId: uid })
  }).then(r => r.json());
  showMsg(r.ok ? \`✅ Юзер \${uid} удалён\` : '❌ Ошибка: ' + r.error, r.ok);
  if (r.ok) loadAll();
}

function showMsg(text, ok) {
  const el = document.getElementById('msg');
  el.textContent = text;
  el.className = ok ? 'msg-ok' : 'msg-err';
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

loadAll();
setInterval(loadActivity, 10000); // activity — кожні 10 сек
setInterval(loadAll, 60000);      // повна статистика — кожну хвилину
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
      users:            Number(users.rows[0].count),
      premium:          Number(premium.rows[0].count),
      new7:             Number(new7.rows[0].count),
      new30:            Number(new30.rows[0].count),
      totalStars:       Number(stars.rows[0].total),
      totalPayments:    Number(pays.rows[0].count),
      readings:         Number(reads.rows[0].count),
      spellsPurchased:  Number(spells.rows[0].count),
    });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /admin/api/users
router.get('/api/users', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT user_id, first_name, birth_date, lang, is_premium, premium_expiry, ref_bonus, created_at
       FROM users ORDER BY created_at DESC LIMIT 500`
    );
    res.json({ ok: true, users: rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /admin/api/activity — live feed останніх подій
router.get('/api/activity', auth, async (req, res) => {
  try {
    // Об'єднуємо activity_log + payments_log в один feed
    const { rows } = await pool.query(`
      SELECT id, user_id, event_type, meta, NULL as stars, created_at FROM activity_log
      UNION ALL
      SELECT id, user_id, 'payment' as event_type, payload as meta, stars, created_at FROM payments_log WHERE status='success'
      ORDER BY created_at DESC LIMIT 50
    `);
    res.json({ ok: true, events: rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /admin/api/payments
router.get('/api/payments', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, u.first_name FROM payments_log p
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
    await pool.query(`DELETE FROM users WHERE user_id=$1`, [uid]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
