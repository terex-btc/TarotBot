'use strict';
/**
 * Тести HTTP API ендпоінтів.
 * Запускає сервер на тестовому порту і перевіряє всі роути.
 * Запуск: node tests/api.test.js
 */

require('dotenv').config({ path: __dirname + '/../backend/.env' });
const http   = require('http');
const assert = require('assert');

// ── Кольори ──────────────────────────────────────────────────────────────────
const G = '\x1b[32m'; const R = '\x1b[31m'; const Y = '\x1b[33m';
const B = '\x1b[36m'; const D = '\x1b[0m';

let passed = 0; let failed = 0;

async function test(name, fn) {
  process.stdout.write(`  ${B}◆${D} ${name} ... `);
  try {
    await fn();
    console.log(`${G}✓ OK${D}`);
    passed++;
  } catch (e) {
    console.log(`${R}✗ FAIL${D}`);
    console.log(`    ${R}${e.message}${D}`);
    failed++;
  }
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
const BASE = `http://localhost:${process.env.TEST_PORT || 3099}`;
// X-Tg-Auth: якщо верифікація вимкнена (немає BOT_TOKEN у тестах) — заголовок не потрібен
const HEADERS = { 'Content-Type': 'application/json' };

async function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const opts = {
      hostname: url.hostname,
      port:     url.port,
      path:     url.pathname + url.search,
      method,
      headers:  HEADERS,
    };
    const r = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (_) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

const TEST_UID = 'test_api_777777777';

// ── Запуск сервера ────────────────────────────────────────────────────────────
async function startServer() {
  // Підміняємо PORT щоб не конфліктувати з production
  process.env.PORT = process.env.TEST_PORT || 3099;
  // Запускаємо в окремому процесі
  const { spawn } = require('child_process');
  const srv = spawn('node', ['backend/server.js'], {
    cwd: __dirname + '/..',
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Чекаємо поки сервер запуститься
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server start timeout')), 15000);
    srv.stdout.on('data', d => {
      if (d.toString().includes('запущено на')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    srv.stderr.on('data', d => {
      if (d.toString().includes('запущено на')) { clearTimeout(timeout); resolve(); }
    });
    srv.on('error', reject);
  });

  return srv;
}

// ── Очищення тестового юзера ─────────────────────────────────────────────────
async function cleanTestUser() {
  const { pool } = require('../backend/db');
  await pool.query(`DELETE FROM diary_entries WHERE user_id=$1`, [TEST_UID]);
  await pool.query(`DELETE FROM spell_purchases WHERE user_id=$1`, [TEST_UID]);
  await pool.query(`DELETE FROM readings WHERE user_id=$1`, [TEST_UID]);
  await pool.query(`DELETE FROM support_messages WHERE user_id=$1`, [TEST_UID]);
  await pool.query(`DELETE FROM payments_log WHERE user_id=$1`, [TEST_UID]);
  await pool.query(`DELETE FROM users WHERE user_id=$1`, [TEST_UID]);
}

// ════════════════════════════════════════════════════════════════════════════
async function run() {
  console.log(`\n${Y}══ Tarot Bot — API Tests ════════════════════════════════${D}\n`);

  let srv;
  try {
    process.stdout.write(`  Запуск тестового сервера на порту ${process.env.TEST_PORT || 3099}... `);
    srv = await startServer();
    console.log(`${G}OK${D}`);
  } catch (e) {
    console.log(`${R}FAIL: ${e.message}${D}`);
    process.exit(1);
  }

  // Невелика затримка щоб БД ініціалізувалась
  await new Promise(r => setTimeout(r, 1500));
  await cleanTestUser();

  // ── Status ──────────────────────────────────────────────────────────────
  console.log(`\n${Y}▸ Базові ендпоінти${D}`);

  await test('GET /api/status — сервер відповідає', async () => {
    const { status, body } = await req('GET', '/api/status');
    assert.strictEqual(status, 200);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.version, '1.0.0');
  });

  await test('GET / — index.html роздається', async () => {
    const { status } = await req('GET', '/');
    assert.strictEqual(status, 200);
  });

  // ── Users ────────────────────────────────────────────────────────────────
  console.log(`\n${Y}▸ /api/users${D}`);

  await test('POST /api/users/init — реєстрація нового юзера', async () => {
    const { status, body } = await req('POST', '/api/users/init', {
      userId: TEST_UID,
      firstName: 'Тест',
      birthDate: '1990-05-15',
      lang: 'ua',
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.ok, true);
    assert.ok(body.user, 'user відсутній у відповіді');
    assert.strictEqual(body.user.userId, TEST_UID);
    assert.strictEqual(body.user.isPremium, false);
  });

  await test('POST /api/users/init — без userId → 400', async () => {
    const { status, body } = await req('POST', '/api/users/init', { firstName: 'Test' });
    assert.strictEqual(status, 400);
    assert.strictEqual(body.ok, false);
  });

  await test('POST /api/users/init — userId не цифровий → 400', async () => {
    const { status, body } = await req('POST', '/api/users/init', { userId: 'abc_hack' });
    assert.strictEqual(status, 400);
    assert.strictEqual(body.ok, false);
    assert.ok(body.error === 'invalid_userId' || body.error === 'userId required');
  });

  await test('GET /api/users/:userId — повертає юзера', async () => {
    const { status, body } = await req('GET', `/api/users/${TEST_UID}`);
    assert.strictEqual(status, 200);
    assert.strictEqual(body.user.firstName, 'Тест');
    assert.strictEqual(body.user.birthDate, '1990-05-15');
    assert.strictEqual(body.user.lang, 'ua');
  });

  await test('GET /api/users/9999999999 — невідомий юзер → 404', async () => {
    const { status, body } = await req('GET', '/api/users/9999999999');
    assert.strictEqual(status, 404);
    assert.strictEqual(body.ok, false);
  });

  await test('GET /api/users/:userId/premium-status — isPremium=false', async () => {
    const { status, body } = await req('GET', `/api/users/${TEST_UID}/premium-status`);
    assert.strictEqual(status, 200);
    assert.strictEqual(body.isPremium, false);
    assert.strictEqual(body.refBonus, 0);
    assert.strictEqual(body.spellCredits, 0);
  });

  await test('PATCH /api/users/:userId — оновлення імені', async () => {
    const { status, body } = await req('PATCH', `/api/users/${TEST_UID}`, {
      firstName: 'Оновлено',
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.user.firstName, 'Оновлено');
  });

  // ── Cards ────────────────────────────────────────────────────────────────
  console.log(`\n${Y}▸ /api/cards${D}`);

  await test('GET /api/cards — повертає 22 карти', async () => {
    const { status, body } = await req('GET', '/api/cards');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body.cards));
    assert.strictEqual(body.cards.length, 22);
  });

  await test('GET /api/cards/0 — перша карта має потрібні поля', async () => {
    const { status, body } = await req('GET', '/api/cards/0');
    assert.strictEqual(status, 200);
    assert.ok(body.card.name, 'name відсутній');
    assert.ok(body.card.upright, 'upright відсутній');
    assert.ok(body.card.reversed, 'reversed відсутній');
  });

  await test('GET /api/cards/draw/random — повертає 1 карту', async () => {
    const { status, body } = await req('GET', '/api/cards/draw/random');
    assert.strictEqual(status, 200);
    assert.ok(body.card, 'card відсутній');
    assert.ok(typeof body.card.id === 'number');
  });

  // ── Readings ─────────────────────────────────────────────────────────────
  console.log(`\n${Y}▸ /api/readings${D}`);

  await test('GET /api/readings/spreads — повертає всі типи розкладів', async () => {
    const { status, body } = await req('GET', '/api/readings/spreads');
    assert.strictEqual(status, 200);
    assert.ok(body.spreads.daily, 'daily відсутній');
    assert.ok(body.spreads.three_card, 'three_card відсутній');
    assert.ok(body.spreads.love, 'love відсутній');
  });

  await test('POST /api/readings/:userId — daily розклад', async () => {
    const { status, body } = await req('POST', `/api/readings/${TEST_UID}`, {
      spreadType: 'daily', lang: 'ua',
    });
    assert.strictEqual(status, 200, `Статус: ${status}, body: ${JSON.stringify(body)}`);
    assert.strictEqual(body.ok, true);
    assert.ok(body.reading, 'reading відсутній');
    assert.ok(Array.isArray(body.reading.cards));
    assert.strictEqual(body.reading.cards.length, 1);
    assert.strictEqual(body.reading.spreadType, 'daily');
  });

  await test('POST /api/readings/:userId — daily кешується (2й запит = cached:true)', async () => {
    const { body } = await req('POST', `/api/readings/${TEST_UID}`, { spreadType: 'daily' });
    assert.strictEqual(body.cached, true, 'Другий daily запит має бути cached');
  });

  await test('POST /api/readings/:userId — premium_required без преміума', async () => {
    const { status, body } = await req('POST', `/api/readings/${TEST_UID}`, {
      spreadType: 'three_card',
    });
    assert.strictEqual(status, 403);
    assert.strictEqual(body.error, 'premium_required');
  });

  await test('GET /api/readings/:userId — повертає список розкладів', async () => {
    const { status, body } = await req('GET', `/api/readings/${TEST_UID}`);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body.readings));
    assert.ok(body.readings.length >= 1);
  });

  // ── Spells ────────────────────────────────────────────────────────────────
  console.log(`\n${Y}▸ /api/spells${D}`);

  await test('GET /api/spells/categories — повертає категорії', async () => {
    const { status, body } = await req('GET', '/api/spells/categories');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body.categories));
    assert.ok(body.categories.length > 0);
  });

  await test('GET /api/spells/today/:userId — повертає заговори + місяць', async () => {
    const { status, body } = await req('GET', `/api/spells/today/${TEST_UID}`);
    assert.strictEqual(status, 200);
    assert.ok(body.moon, 'moon відсутній');
    assert.ok(body.moon.emoji);
    assert.ok(body.moon.name);
    assert.ok(Array.isArray(body.spells));
    assert.ok(body.spells.length > 0);
  });

  await test('GET /api/spells/today/:userId — без преміума є locked заговори', async () => {
    const { body } = await req('GET', `/api/spells/today/${TEST_UID}`);
    const hasLocked = body.spells.some(s => s.locked === true);
    assert.ok(hasLocked, 'Мають бути заблоковані заговори для не-преміум юзера');
  });

  await test('GET /api/spells/:id — premium_required без оплати', async () => {
    const { body: cats } = await req('GET', '/api/spells/categories');
    // Отримуємо ID першого преміум заговору
    const { body: cat } = await req('GET', `/api/spells/category/${cats.categories[0].id}?userId=${TEST_UID}`);
    const premiumSpell = cat.spells?.find(s => s.premium && s.locked);
    if (!premiumSpell) { return; } // всі безкоштовні — ок
    const { status, body } = await req('GET', `/api/spells/${premiumSpell.id}?userId=${TEST_UID}`);
    assert.strictEqual(status, 403);
    assert.strictEqual(body.error, 'premium_required');
  });

  // ── Payments ─────────────────────────────────────────────────────────────
  console.log(`\n${Y}▸ /api/payments${D}`);

  await test('GET /api/payments/plans — повертає плани', async () => {
    const { status, body } = await req('GET', '/api/payments/plans');
    assert.strictEqual(status, 200);
    assert.ok(body.plans.premium_30, 'premium_30 відсутній');
    assert.ok(body.plans.premium_90, 'premium_90 відсутній');
    assert.ok(body.plans.premium_365, 'premium_365 відсутній');
    assert.ok(body.plans.spell_pack5, 'spell_pack5 відсутній');
    assert.strictEqual(body.plans.premium_30.stars, 299);
    assert.strictEqual(body.plans.premium_90.stars, 699);
    assert.strictEqual(body.plans.premium_365.stars, 1990);
    assert.strictEqual(body.plans.spell_pack5.stars, 99);
    console.log(`       Планів: ${Object.keys(body.plans).length}`);
  });

  await test('POST /api/payments/invoice — без бота → 503', async () => {
    // У тестовому середовищі бот не ініціалізований (або без токена)
    const { status, body } = await req('POST', '/api/payments/invoice', {
      planId: 'premium_30', userId: TEST_UID,
    });
    // Або 503 (бот не ініціалізований) або успіх якщо BOT_TOKEN є
    assert.ok(status === 503 || status === 200 || status === 500,
      `Неочікуваний статус: ${status}`);
  });

  await test('POST /api/payments/invoice — невідомий план → 400', async () => {
    const { status, body } = await req('POST', '/api/payments/invoice', {
      planId: 'fake_plan', userId: TEST_UID,
    });
    assert.strictEqual(status, 400);
    assert.strictEqual(body.ok, false);
  });

  await test('GET /api/payments/my-spells/:userId — порожній список', async () => {
    const { status, body } = await req('GET', `/api/payments/my-spells/${TEST_UID}`);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body.spells));
    assert.strictEqual(body.spells.length, 0);
  });

  // ── Diary ────────────────────────────────────────────────────────────────
  console.log(`\n${Y}▸ /api/diary${D}`);

  await test('POST /api/diary/:userId — додає запис', async () => {
    const { status, body } = await req('POST', `/api/diary/${TEST_UID}`, {
      text: 'Тестовий запис в щоденнику 🌙',
      moonEmoji: '🌕',
      moonName: 'Повний місяць',
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.ok, true);
    assert.ok(body.entry.id);
  });

  await test('GET /api/diary/:userId — повертає записи', async () => {
    const { status, body } = await req('GET', `/api/diary/${TEST_UID}`);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body.entries));
    assert.strictEqual(body.entries[0].text, 'Тестовий запис в щоденнику 🌙');
  });

  await test('POST /api/diary/:userId — порожній текст → 400', async () => {
    const { status } = await req('POST', `/api/diary/${TEST_UID}`, { text: '   ' });
    assert.strictEqual(status, 400);
  });

  // ── Rate Limiting ─────────────────────────────────────────────────────────
  console.log(`\n${Y}▸ Rate Limiting${D}`);

  await test('Rate limit /api/users/init (>10 req/min) → 429', async () => {
    let got429 = false;
    for (let i = 0; i < 15; i++) {
      const { status } = await req('POST', '/api/users/init', { userId: `rl_test_${i}` });
      if (status === 429) { got429 = true; break; }
    }
    assert.ok(got429, 'Rate limit не спрацював після 10+ запитів');
  });

  // ── Input Validation ──────────────────────────────────────────────────────
  console.log(`\n${Y}▸ Валідація вводу${D}`);

  await test('userId з літерами → 400', async () => {
    const { status } = await req('GET', '/api/users/admin_hack');
    assert.strictEqual(status, 400);
  });

  await test('userId з SQL injection → 400', async () => {
    const { status } = await req('GET', "/api/users/1;DROP TABLE users;--");
    assert.strictEqual(status, 400);
  });

  await test('Великий JSON body (>50kb) → 413', async () => {
    const bigBody = { userId: TEST_UID, junk: 'x'.repeat(60 * 1024) };
    const { status } = await req('POST', '/api/users/init', bigBody);
    assert.strictEqual(status, 413, 'Великий body має відхилятися');
  });

  // ── Cleanup ───────────────────────────────────────────────────────────────
  await cleanTestUser();

  // ── Підсумок ──────────────────────────────────────────────────────────────
  console.log(`\n${Y}══════════════════════════════════════════════════════════${D}`);
  console.log(`  ${G}Пройдено: ${passed}${D}   ${failed > 0 ? R : G}Провалено: ${failed}${D}`);
  console.log(`${Y}══════════════════════════════════════════════════════════${D}\n`);

  srv.kill();
  const { pool } = require('../backend/db');
  await pool.end().catch(() => {});
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(async e => {
  console.error(`\n${R}Критична помилка: ${e.message}${D}`);
  console.error(e.stack);
  process.exit(1);
});
