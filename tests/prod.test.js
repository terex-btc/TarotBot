'use strict';
/**
 * Production tests — запускаються проти живого сервера на Railway.
 * Не потребують прямого підключення до БД.
 * Запуск: node tests/prod.test.js
 */

require('dotenv').config({ path: __dirname + '/../backend/.env' });

const https  = require('https');
const http   = require('http');

const BASE      = process.env.WEBAPP_URL || 'http://localhost:3000';
const ADMIN_KEY = process.env.ADMIN_KEY  || '';

const G = '\x1b[32m'; const R = '\x1b[31m'; const Y = '\x1b[33m';
const B = '\x1b[36m'; const D = '\x1b[0m';

let passed = 0; let failed = 0;

async function test(name, fn) {
  process.stdout.write(`  ${B}◆${D} ${name} ... `);
  try {
    await fn();
    console.log(`${G}✓ PASS${D}`);
    passed++;
  } catch (e) {
    console.log(`${R}✗ FAIL${D}`);
    console.log(`    ${R}→ ${e.message}${D}`);
    failed++;
  }
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
async function req(method, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url     = new URL(BASE + path);
    const isHttps = url.protocol === 'https:';
    const mod     = isHttps ? https : http;
    const postData = body ? JSON.stringify(body) : undefined;

    const opts = {
      hostname: url.hostname,
      port:     url.port || (isHttps ? 443 : 80),
      path:     url.pathname + url.search,
      method,
      headers:  {
        'Content-Type':  'application/json',
        'Content-Length': postData ? Buffer.byteLength(postData) : 0,
        ...extraHeaders,
      },
    };

    const r = mod.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) }); }
        catch (_) { resolve({ status: res.statusCode, headers: res.headers, body: data }); }
      });
    });
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

// ── Тестовий юзер ────────────────────────────────────────────────────────────
const UID = '999000111'; // числовий тестовий ID

// ════════════════════════════════════════════════════════════════════════════
async function run() {
  console.log(`\n${Y}══ Tarot Bot — Production Tests ══════════════════════════${D}`);
  console.log(`  Server: ${BASE}\n`);

  // ── 1. Базове ──────────────────────────────────────────────────────────────
  console.log(`${Y}▸ Сервер${D}`);

  await test('GET /api/status → ok:true, bot:true', async () => {
    const { status, body } = await req('GET', '/api/status');
    assertEqual(status, 200);
    assert(body.ok === true, 'ok не true');
    assert(body.bot === true, 'bot не true');
    assert(body.botUsername, 'botUsername порожній');
    console.log(`\n       @${body.botUsername}`);
  });

  // ── 2. Реєстрація ─────────────────────────────────────────────────────────
  console.log(`\n${Y}▸ Реєстрація та профіль${D}`);

  await test('POST /api/users/init — новий юзер', async () => {
    const { status, body } = await req('POST', '/api/users/init', {
      userId: UID, firstName: 'ТестПрод', birthDate: '1990-05-15', lang: 'ua',
    });
    assertEqual(status, 200, `Статус: ${status}`);
    assert(body.ok, `Помилка: ${body.error}`);
    assertEqual(body.user.userId, UID);
    assert(body.user.astro?.zodiac?.emoji, 'Астрологія не розрахувалась');
    console.log(`\n       zodiac: ${body.user.astro.zodiac.emoji} ${body.user.astro.zodiac.name}, lifePath: ${body.user.astro.lifePath}`);
  });

  await test('GET /api/users/:id/premium-status — isPremium:false', async () => {
    const { status, body } = await req('GET', `/api/users/${UID}/premium-status`);
    assertEqual(status, 200);
    assertEqual(body.isPremium, false, 'Новий юзер не може мати преміум');
    assertEqual(body.spellCredits, 0);
    assertEqual(body.refBonus, 0);
  });

  // ── 3. Карти ──────────────────────────────────────────────────────────────
  console.log(`\n${Y}▸ Карти${D}`);

  await test('GET /api/cards — 22 карти Старшого Аркана', async () => {
    const { body } = await req('GET', '/api/cards');
    assert(Array.isArray(body.cards), 'cards не масив');
    assertEqual(body.cards.length, 22, `Очікувалось 22, отримано ${body.cards.length}`);
    const card = body.cards[0];
    assert(card.name, 'name відсутній');
    assert(card.upright?.ru, 'upright.ru відсутній');
    assert(card.reversed?.ru, 'reversed.ru відсутній');
    console.log(`\n       Перша карта: ${card.emoji} ${card.name}`);
  });

  await test('GET /api/cards/draw/random — випадкова карта', async () => {
    const { body } = await req('GET', '/api/cards/draw/random');
    assert(body.card, 'card відсутній');
    assert(typeof body.card.id === 'number', 'id не число');
    assert(body.card.id >= 0 && body.card.id <= 21, `id поза діапазоном: ${body.card.id}`);
  });

  // ── 4. Розклади ───────────────────────────────────────────────────────────
  console.log(`\n${Y}▸ Розклади${D}`);

  await test('GET /api/readings/spreads — 5 типів', async () => {
    const { body } = await req('GET', '/api/readings/spreads');
    const keys = Object.keys(body.spreads || {});
    assert(keys.includes('daily'), 'daily відсутній');
    assert(keys.includes('three_card'), 'three_card відсутній');
    assert(keys.includes('love'), 'love відсутній');
    assert(keys.includes('month'), 'month відсутній');
    assert(keys.includes('year'), 'year відсутній');
    console.log(`\n       Типів: ${keys.join(', ')}`);
  });

  await test('POST /api/readings — daily (1 карта)', async () => {
    const { status, body } = await req('POST', `/api/readings/${UID}`, {
      spreadType: 'daily', lang: 'ua',
    });
    assertEqual(status, 200, `Статус: ${status}, error: ${body?.error}`);
    assert(body.ok, `Помилка: ${body.error}`);
    assertEqual(body.reading.cards.length, 1);
    assert(body.reading.interpretation, 'інтерпретація порожня');
    console.log(`\n       Карта: ${body.reading.cards[0].emoji} ${body.reading.cards[0].name}${body.reading.cards[0].isReversed?' (перевернута)':''}`);
  });

  await test('POST /api/readings — daily вдруге → cached:true', async () => {
    const { body } = await req('POST', `/api/readings/${UID}`, { spreadType: 'daily' });
    assert(body.ok, `Помилка: ${body.error}`);
    assertEqual(body.cached, true, 'Другий запит daily має бути кешований');
  });

  await test('POST /api/readings — three_card без преміума → 403', async () => {
    const { status, body } = await req('POST', `/api/readings/${UID}`, { spreadType: 'three_card' });
    assertEqual(status, 403, `Очікувалось 403, отримано ${status}`);
    assertEqual(body.error, 'premium_required');
  });

  await test('POST /api/readings — love без преміума → 403', async () => {
    const { status, body } = await req('POST', `/api/readings/${UID}`, { spreadType: 'love' });
    assertEqual(status, 403);
    assertEqual(body.error, 'premium_required');
  });

  // ── 5. Заговори ───────────────────────────────────────────────────────────
  console.log(`\n${Y}▸ Заговори${D}`);

  await test('GET /api/spells/categories — 8 категорій', async () => {
    const { body } = await req('GET', '/api/spells/categories');
    assert(Array.isArray(body.categories), 'categories не масив');
    assert(body.categories.length >= 5, `Мало категорій: ${body.categories.length}`);
    console.log(`\n       Категорій: ${body.categories.length} — ${body.categories.map(c=>c.name||c.id).join(', ')}`);
  });

  await test('GET /api/spells/today/:uid — місяць + заговори', async () => {
    const { body } = await req('GET', `/api/spells/today/${UID}`);
    assert(body.ok, `Помилка: ${body.error}`);
    assert(body.moon?.energy, 'moon відсутній');
    assert(Array.isArray(body.spells) && body.spells.length > 0, 'Заговори відсутні');
    const locked = body.spells.filter(s => s.locked).length;
    const free   = body.spells.filter(s => !s.locked).length;
    console.log(`\n       Місяць: ${body.moon.emoji} ${body.moon.name} | вільних: ${free}, locked: ${locked}`);
  });

  await test('GET /api/spells/:id — premium заговор без оплати → 403', async () => {
    // Знаходимо перший premium заговор
    const { body: cats } = await req('GET', '/api/spells/categories');
    let premiumSpell = null;
    for (const cat of cats.categories) {
      const { body } = await req('GET', `/api/spells/category/${cat.id}?userId=${UID}`);
      premiumSpell = (body.spells || []).find(s => s.premium && s.locked);
      if (premiumSpell) break;
    }
    if (!premiumSpell) { throw new Error('Немає premium заговорів для тесту'); }
    const { status, body } = await req('GET', `/api/spells/${premiumSpell.id}?userId=${UID}`);
    assertEqual(status, 403, `Очікувалось 403, отримано ${status}`);
    assertEqual(body.error, 'premium_required');
    console.log(`\n       Заблокований заговор: ${premiumSpell.id}`);
  });

  // ── 6. Платежі — плани і ціни ─────────────────────────────────────────────
  console.log(`\n${Y}▸ Платежі — плани${D}`);

  await test('GET /api/payments/plans — всі плани з правильними цінами', async () => {
    const { body } = await req('GET', '/api/payments/plans');
    assert(body.ok);
    const p = body.plans;
    assertEqual(p.premium_30?.stars,  299,  'premium_30 ціна неправильна');
    assertEqual(p.premium_90?.stars,  699,  'premium_90 ціна неправильна');
    assertEqual(p.premium_365?.stars, 1990, 'premium_365 ціна неправильна');
    assertEqual(p.spell_pack5?.stars, 99,   'spell_pack5 ціна неправильна');
    assertEqual(p.spell_single?.stars, 30,  'spell_single ціна неправильна');
    console.log(`\n       ✓ premium_30:299 premium_90:699 premium_365:1990 pack5:99 spell:30`);
  });

  await test('GET /api/payments/my-spells/:uid — порожньо', async () => {
    const { body } = await req('GET', `/api/payments/my-spells/${UID}`);
    assert(body.ok);
    assertEqual(body.spells.length, 0, `Очікувалось 0 покупок, отримано ${body.spells.length}`);
  });

  await test('POST /api/payments/invoice — неіснуючий план → 400', async () => {
    const { status, body } = await req('POST', '/api/payments/invoice', {
      planId: 'fake_premium', userId: UID,
    });
    assertEqual(status, 400);
    assertEqual(body.ok, false);
  });

  // ── 7. Симуляція активації преміума через admin endpoint ──────────────────
  console.log(`\n${Y}▸ Premium — активація через адмін (симуляція оплати)${D}`);

  await test('POST /api/users/:uid/premium — активація через admin key', async () => {
    const { status, body } = await req(
      'POST', `/api/users/${UID}/premium`,
      { adminKey: ADMIN_KEY }
    );
    assertEqual(status, 200, `Статус: ${status}, error: ${JSON.stringify(body)}`);
    assert(body.ok, `Помилка: ${body.error}`);
    assert(body.user.isPremium === true, 'isPremium не true після активації');
    console.log(`\n       isPremium: ${body.user.isPremium} ✓`);
  });

  await test('GET /api/users/:uid/premium-status → isPremium:true', async () => {
    const { body } = await req('GET', `/api/users/${UID}/premium-status`);
    assertEqual(body.isPremium, true, 'isPremium має бути true після активації');
  });

  await test('POST /api/readings — three_card після преміума → 200', async () => {
    const { status, body } = await req('POST', `/api/readings/${UID}`, {
      spreadType: 'three_card', lang: 'ua',
    });
    assertEqual(status, 200, `Статус: ${status}, error: ${body?.error}`);
    assert(body.ok, `Помилка: ${body.error}`);
    assertEqual(body.reading.cards.length, 3, `Очікувалось 3 карти, отримано ${body.reading.cards.length}`);
    console.log(`\n       Карти: ${body.reading.cards.map(c=>c.name).join(', ')}`);
  });

  await test('POST /api/readings — love (4 карти) після преміума → 200', async () => {
    const { status, body } = await req('POST', `/api/readings/${UID}`, {
      spreadType: 'love', lang: 'ua',
    });
    assertEqual(status, 200, `Статус: ${status}`);
    assertEqual(body.reading.cards.length, 4);
  });

  await test('POST /api/readings — year (6 карт) після преміума → 200', async () => {
    const { status, body } = await req('POST', `/api/readings/${UID}`, {
      spreadType: 'year', lang: 'ua',
    });
    assertEqual(status, 200);
    assertEqual(body.reading.cards.length, 6);
    console.log(`\n       Рік: ${body.reading.cards.map(c=>c.name).join(', ')}`);
  });

  await test('GET /api/spells/:id — premium заговор після активації → 200', async () => {
    const { body: cats } = await req('GET', '/api/spells/categories');
    let premiumSpell = null;
    for (const cat of cats.categories) {
      const { body } = await req('GET', `/api/spells/category/${cat.id}?userId=${UID}`);
      premiumSpell = (body.spells || []).find(s => s.premium);
      if (premiumSpell) break;
    }
    if (!premiumSpell) { throw new Error('Немає premium заговорів'); }
    const { status, body } = await req('GET', `/api/spells/${premiumSpell.id}?userId=${UID}`);
    assertEqual(status, 200, `Очікувалось 200, отримано ${status}, error: ${body?.error}`);
    assert(body.ok, `Заговор недоступний після преміума: ${body.error}`);
    assert(body.spell?.title, 'title заговору відсутній');
    console.log(`\n       Розблокований заговор: ${body.spell.emoji} ${body.spell.title}`);
  });

  // ── 8. Щоденник ───────────────────────────────────────────────────────────
  console.log(`\n${Y}▸ Щоденник${D}`);

  let diaryEntryId;
  await test('POST /api/diary/:uid — додає запис', async () => {
    const { status, body } = await req('POST', `/api/diary/${UID}`, {
      text: '🌙 Тест щоденника — продакшн перевірка',
      moonEmoji: '🌕', moonName: 'Повний місяць',
    });
    assertEqual(status, 200);
    assert(body.ok);
    assert(body.entry.id, 'id запису відсутній');
    diaryEntryId = body.entry.id;
  });

  await test('GET /api/diary/:uid — повертає запис', async () => {
    const { body } = await req('GET', `/api/diary/${UID}`);
    assert(body.ok);
    assert(body.entries.length >= 1);
    const entry = body.entries.find(e => e.id === diaryEntryId);
    assert(entry, 'Запис не знайдений');
    assert(entry.text.includes('Тест щоденника'), 'Текст запису не збігається');
  });

  await test('DELETE /api/diary/:uid/:id — видаляє запис', async () => {
    const { status, body } = await req('DELETE', `/api/diary/${UID}/${diaryEntryId}`);
    assertEqual(status, 200);
    assert(body.ok);
    // Перевіряємо що видалено
    const { body: check } = await req('GET', `/api/diary/${UID}`);
    const stillExists = check.entries?.find(e => e.id === diaryEntryId);
    assert(!stillExists, 'Запис не видалений');
  });

  // ── 9. Безпека ────────────────────────────────────────────────────────────
  console.log(`\n${Y}▸ Безпека${D}`);

  await test('SQL injection → 400 invalid_userId', async () => {
    const { status, body } = await req('GET', '/api/users/1%3BDROP%20TABLE%20users%3B--');
    assertEqual(status, 400);
    assertEqual(body.error, 'invalid_userId');
  });

  await test('Payload bomb (>50KB) → 413', async () => {
    const { status } = await req('POST', '/api/users/init', {
      userId: UID, junk: 'x'.repeat(60000),
    });
    assertEqual(status, 413, `Очікувалось 413, отримано ${status}`);
  });

  await test('Security headers присутні', async () => {
    const { headers } = await req('GET', '/');
    assert(headers['x-frame-options'], 'X-Frame-Options відсутній');
    assert(headers['x-content-type-options'], 'X-Content-Type-Options відсутній');
    assert(headers['strict-transport-security'] || BASE.startsWith('http://'), 'HSTS відсутній');
    assert(headers['referrer-policy'], 'Referrer-Policy відсутній');
  });

  await test('Rate limit /api/users/init → 429 після 10+ запитів', async () => {
    let got429 = false;
    for (let i = 0; i < 15; i++) {
      const { status } = await req('POST', '/api/users/init', { userId: `rl_${i}` });
      if (status === 429) { got429 = true; console.log(`\n       спрацював на запиті ${i+1}`); break; }
    }
    assert(got429, 'Rate limit не спрацював');
  });

  // ── 10. Очищення тестового юзера ─────────────────────────────────────────
  console.log(`\n${Y}▸ Cleanup${D}`);

  await test('DELETE /api/users/:uid/self — видалення тестового акаунту', async () => {
    const { status, body } = await req('DELETE', `/api/users/${UID}/self`);
    assertEqual(status, 200, `Статус: ${status}`);
    assert(body.ok, `Помилка: ${body.error}`);
    // Перевіряємо що юзера більше немає
    const { status: s2 } = await req('GET', `/api/users/${UID}`);
    assertEqual(s2, 404, 'Юзер не видалений');
  });

  // ── Підсумок ─────────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log(`\n${Y}══════════════════════════════════════════════════════════${D}`);
  console.log(`  Тестів: ${total}   ${G}Пройдено: ${passed}${D}   ${failed > 0 ? R+'Провалено: '+failed+D : G+'Провалено: 0'+D}`);
  if (failed === 0) {
    console.log(`\n  ${G}✅ Всі тести пройшли — продакшн готовий!${D}`);
  } else {
    console.log(`\n  ${R}❌ Є провали — перевір логи вище.${D}`);
  }
  console.log(`${Y}══════════════════════════════════════════════════════════${D}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => {
  console.error(`\n${R}Критична помилка: ${e.message}${D}`);
  console.error(e.stack);
  process.exit(1);
});
