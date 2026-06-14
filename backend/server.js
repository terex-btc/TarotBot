require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const path    = require('path');
const TelegramBot   = require('node-telegram-bot-api');
const cron          = require('node-cron');
const { initDB, pool } = require('./db');
const { setUserPremium, addRefBonus } = require('./routes/users');
const { handleAdminReply }            = require('./routes/support');
const { getMoonPhase }                = require('./services/algorithmService');
const { bumpActivity }                = require('./routes/admin');
const { verifyTelegramAuth, ownerOnly, validateUserId, limits } = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;

// ─── Trust proxy (Railway / Nginx) ────────────────────────────────────────────
// Без цього req.ip завжди буде 127.0.0.1 і rate limit per-IP не буде працювати
app.set('trust proxy', 1);

// ─── Middleware ───────────────────────────────────────────────────────────────
// Security headers (XSS, clickjacking, MIME sniffing, etc.)
app.use(helmet({
  contentSecurityPolicy: false, // вимикаємо CSP — Telegram WebApp додає свої скрипти
  crossOriginEmbedderPolicy: false,
}));

// CORS — відкрито для Telegram WebApp (Mini Apps запускаються з різних origin)
// Безпека забезпечується через Telegram initData HMAC + rate limiting
app.use(cors({
  origin: true, // дозволяємо всі origin — Telegram WebApp може мати будь-який
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Tg-Auth'],
  credentials: false,
}));

// Ліміт розміру тіла запиту — захист від payload bomb
app.use(express.json({ limit: '50kb' }));
// Статика: JS/CSS кешуємо на 1 годину, index.html — ніколи (щоб оновлення одразу доходили)
app.use(express.static(path.join(__dirname, '../frontend'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (/\.(js|css|png|jpg|svg|ico|woff2?)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  },
}));

// ─── Telegram Bot ─────────────────────────────────────────────────────────────
let bot;
if (BOT_TOKEN) {
  bot = new TelegramBot(BOT_TOKEN, { polling: true });

  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const name   = msg.from?.first_name || 'Дорогая';
    const webAppUrl = process.env.WEBAPP_URL || `http://localhost:${PORT}`;

    // ── UTM: /start src_channelname → зберігаємо джерело (first-touch) ──────
    const srcMatch = (msg.text || '').match(/\/start\s+src_([\w-]{1,32})/);
    if (srcMatch) {
      pool.query(
        `INSERT INTO users (user_id, source) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET source = COALESCE(users.source, EXCLUDED.source)`,
        [String(chatId), srcMatch[1]]
      ).catch(() => {});
    }

    // Шаг 1 — приветствие с анимацией (стикер шара)
    try {
      await bot.sendSticker(chatId, 'CAACAgIAAxkBAAIBc2Z5dQABm6eLAAF2v3v2sQ7UiXM2gAACGAADwDZME6TvFKFwZ0I-NQQ');
    } catch (_) { /* якщо стікер не доступний — ігноруємо */ }

    const welcome = `🔮 *Добро пожаловать, ${name}!*

Я — *Магический кабинет* — твой личный проводник в мире Таро, заговоров и лунной магии.

✨ *Что я умею:*
🃏 Карта дня — персонально по дате рождения
🃏 Расклады: Три карты, Любовь, Месяц, Год
🕯️ Заговоры на любовь, деньги, красоту, защиту
🌙 Лунный календарь с ритуалами на каждый день
🔢 Нумерология и астрология — всё связано с тобой

💜 *Как начать:*
Нажми кнопку ниже 👇 введи своё имя и дату рождения — и звёзды откроют тебе послание дня.`;

    await bot.sendMessage(chatId, welcome, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔮 Открыть Магический кабинет', web_app: { url: webAppUrl } }],
          [{ text: '🌙 Лунный календарь сегодня', web_app: { url: `${webAppUrl}?screen=moon` } }],
          [{ text: '🕯️ Заговоры на сегодня', web_app: { url: `${webAppUrl}?screen=spells` } }],
        ]
      }
    });
  });

  // /tarot — быстрый вход в расклады
  bot.onText(/\/tarot/, async (msg) => {
    const chatId = msg.chat.id;
    const webAppUrl = process.env.WEBAPP_URL || `http://localhost:${PORT}`;
    await bot.sendMessage(chatId, '🃏 *Таро ждёт тебя*\n\nОткрой кабинет и получи карту дня — она уже выбрана специально для тебя.', {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🃏 Открыть Таро', web_app: { url: `${webAppUrl}?screen=tarot` } }]] }
    });
  });

  // /moon — лунный календарь
  bot.onText(/\/moon/, async (msg) => {
    const chatId = msg.chat.id;
    const webAppUrl = process.env.WEBAPP_URL || `http://localhost:${PORT}`;
    const moon = getMoonPhase(new Date().toISOString().split('T')[0]);

    await bot.sendMessage(chatId,
      `${moon.emoji} *Луна сегодня — ${moon.name}*\n\n${getMoonDesc(moon.energy)}\n\nОткрой календарь чтобы узнать что можно делать сегодня 👇`,
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🌙 Открыть лунный календарь', web_app: { url: `${webAppUrl}?screen=moon` } }]] }
      }
    );
  });

  function getMoonDesc(energy) {
    const d = {
      new:     'Новолуние — время загадывать желания и начинать новые дела. Самое мощное время для привлечения.',
      waxing:  'Растущая луна — всё что начнёшь будет расти и усиливаться. Время привлечения и роста.',
      first:   'Первая четверть — время активных действий. Ритуалы на успех и карьеру сейчас особенно сильны.',
      gibbous: 'Луна почти полная. Заговоры на любовь и деньги достигают пика силы.',
      full:    'Полнолуние — максимальная магическая сила! Все ритуалы работают в полную мощь.',
      waning:  'Убывающая луна — время очищения и избавления от негатива, снятия порчи и сглаза.',
      last:    'Последняя четверть — время завершения и отпускания всего лишнего.',
      dark:    'Тёмная луна — время тайных дел, защиты и работы с интуицией.',
    };
    return d[energy] || 'Время магии и ритуалов.';
  }

  // /ref — реферальна система
  bot.onText(/\/ref/, async (msg) => {
    const chatId = msg.chat.id;
    const webAppUrl = process.env.WEBAPP_URL || `http://localhost:${PORT}`;
    if (!_cachedBotUsername) { try { _cachedBotUsername = (await bot.getMe()).username; } catch (_) {} }
    const refLink = `https://t.me/${_cachedBotUsername || 'bot'}?start=ref_${chatId}`;
    await bot.sendMessage(chatId,
      `🎁 *Пригласи подругу — получи Премиум!*\n\nТвоя реферальная ссылка:\n\`${refLink}\`\n\n✨ За каждую подругу которая зарегистрируется — ты получаешь *1 день Премиума* бесплатно!\n3 подруги = *3 дня* 🔮`,
      { parse_mode: 'Markdown' }
    );
  });

  // Обробка реферального /start
  bot.onText(/\/start ref_(\d+)/, async (msg, match) => {
    const chatId    = msg.chat.id;
    const refUserId = match[1];
    const webAppUrl = process.env.WEBAPP_URL || `http://localhost:${PORT}`;
    if (String(chatId) === refUserId) return;

    // Джерело: реферал (first-touch)
    pool.query(
      `INSERT INTO users (user_id, source) VALUES ($1, 'ref')
       ON CONFLICT (user_id) DO UPDATE SET source = COALESCE(users.source, 'ref')`,
      [String(chatId)]
    ).catch(() => {});

    try {
      await addRefBonus(refUserId, 1);
      await bot.sendMessage(refUserId,
        `🎉 Твоя подруга присоединилась!\n✨ Тебе начислен *1 день Премиума* 🔮`,
        { parse_mode: 'Markdown' }
      );
    } catch (_) {}

    const name = msg.from?.first_name || 'Дорогая';
    await bot.sendMessage(chatId,
      `🔮 *Добро пожаловать, ${name}!*\n\nТебя пригласила подруга — звёзды уже ждут тебя!\n\n✨ Открой Магический кабинет и получи карту дня 👇`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔮 Открыть Магический кабинет', web_app: { url: webAppUrl } }]] } }
    );
  });

  // ── Платежі Telegram Stars ────────────────────────────────────────────────

  // pre_checkout — обов'язково відповісти протягом 10 секунд
  bot.on('pre_checkout_query', async (query) => {
    try {
      await bot.answerPreCheckoutQuery(query.id, true);
      console.log(`[Pay] pre_checkout OK — user=${query.from.id} payload=${query.invoice_payload}`);
    } catch (e) {
      console.error('[Pay] pre_checkout error:', e.message);
      try { await bot.answerPreCheckoutQuery(query.id, false, 'Ошибка. Попробуйте позже.'); } catch (_) {}
    }
  });

  bot.on('successful_payment', async (msg) => {
    const chatId  = msg.chat.id;
    const uid     = String(chatId);
    const payment = msg.successful_payment;
    const payload = payment.invoice_payload;
    const stars   = payment.total_amount;
    const webAppUrl = process.env.WEBAPP_URL || `http://localhost:${PORT}`;

    console.log(`[Pay] successful_payment — uid=${uid} stars=${stars} payload=${payload}`);

    try {
      // Гарантуємо що юзер існує в БД
      await pool.query(
        `INSERT INTO users (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
        [uid]
      );
      // Логуємо платіж в analytics
      await pool.query(
        `INSERT INTO payments_log (user_id, payload, stars, status) VALUES ($1,$2,$3,'success')`,
        [uid, payload, stars]
      ).catch(() => {}); // не блокуємо якщо таблиця ще не створена
      bumpActivity?.();

      // ── Преміум підписка ──────────────────────────────────────────────────
      if (payload.startsWith('premium_')) {
        const daysMap = { premium_30: 30, premium_90: 90, premium_365: 365, premium_30_promo: 30 };
        const days = daysMap[payload] || 30;

        // Продовжуємо від поточного expiry якщо вже є преміум
        const { rows } = await pool.query(`SELECT premium_expiry FROM users WHERE user_id=$1`, [uid]);
        const current  = rows[0]?.premium_expiry ? Number(rows[0].premium_expiry) : 0;
        const base     = Math.max(current, Date.now());
        await setUserPremium(uid, base + days * 86400000);

        const expireDate = new Date(base + days * 86400000).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        await bot.sendMessage(chatId,
          `👑 *Премиум активирован!*\n\n` +
          `⭐ Оплачено: *${stars} Stars*\n` +
          `📅 Срок: *${days} дней* — до ${expireDate}\n\n` +
          `✨ Теперь доступно:\n` +
          `🃏 Все расклады Таро\n` +
          `🕯️ 55 заговоров и ритуалов\n` +
          `🌙 Полный лунный дневник\n` +
          `🔮 Полное толкование снов\n\n` +
          `Открой кабинет — всё уже разблокировано! 👇`,
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[
              { text: '🔮 Открыть Магический кабинет', web_app: { url: webAppUrl } }
            ]]}
          }
        );
        console.log(`[Pay] Premium ${days}d activated for uid=${uid}`);

      // ── Разовий розклад ───────────────────────────────────────────────────
      } else if (payload.startsWith('spread:')) {
        const spreadType = payload.replace('spread:', '');
        await pool.query(
          `INSERT INTO spread_credits (user_id, spread_type, credits) VALUES ($1, $2, 1)
           ON CONFLICT (user_id, spread_type) DO UPDATE SET credits = spread_credits.credits + 1`,
          [uid, spreadType]
        );
        pool.query(`INSERT INTO activity_log (user_id, event_type, meta) VALUES ($1,'spread_buy',$2)`, [uid, spreadType]).catch(() => {});
        const spreadNames = { love: '❤️ Любовь', month: '📅 Месяц', year: '🌟 Год', three_card: '🃏 3 карты' };
        await bot.sendMessage(chatId,
          `🔮 *Расклад куплен!*\n\n` +
          `⭐ Оплачено: *${stars} Stars*\n` +
          `🃏 Расклад: *${spreadNames[spreadType] || spreadType}*\n\n` +
          `✨ Карты уже ждут тебя — открой приложение и задай свой вопрос 👇`,
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[
              { text: '🔮 Открыть расклад', web_app: { url: webAppUrl } }
            ]]}
          }
        );
        console.log(`[Pay] Spread ${spreadType} purchased by uid=${uid}`);

      // ── Один заговор ──────────────────────────────────────────────────────
      } else if (payload.startsWith('spell:')) {
        const spellId = payload.replace('spell:', '');
        await pool.query(
          `INSERT INTO spell_purchases (user_id, spell_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [uid, spellId]
        );
        pool.query(`INSERT INTO activity_log (user_id, event_type, meta) VALUES ($1,'spell',$2)`, [uid, spellId]).catch(() => {});
        await bot.sendMessage(chatId,
          `🕯️ *Заговор куплен!*\n\n` +
          `⭐ Оплачено: *${stars} Stars*\n\n` +
          `✨ Заговор разблокирован навсегда!\nОткрой приложение и найди его в разделе Заговоры 👇`,
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[
              { text: '🕯️ Открыть заговоры', web_app: { url: webAppUrl } }
            ]]}
          }
        );
        console.log(`[Pay] Spell ${spellId} purchased by uid=${uid}`);

      // ── Пак 5 заговорів ───────────────────────────────────────────────────
      } else if (payload === 'spell_pack5') {
        await pool.query(
          `UPDATE users SET spell_credits = COALESCE(spell_credits, 0) + 5 WHERE user_id = $1`,
          [uid]
        );
        const { rows: u } = await pool.query(`SELECT spell_credits FROM users WHERE user_id=$1`, [uid]);
        const total = u[0]?.spell_credits || 5;
        await bot.sendMessage(chatId,
          `✨ *Пак заговоров куплен!*\n\n` +
          `⭐ Оплачено: *${stars} Stars*\n` +
          `🕯️ Добавлено: *5 кредитов*\n` +
          `💎 Всего на счету: *${total}*\n\n` +
          `Открой любой заговор в приложении — кредит спишется автоматически 👇`,
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[
              { text: '🕯️ Открыть заговоры', web_app: { url: webAppUrl } }
            ]]}
          }
        );
        console.log(`[Pay] Spell pack (+5 credits) purchased by uid=${uid}, total=${total}`);

      } else {
        // Невідомий payload — логуємо
        console.warn(`[Pay] Unknown payload: ${payload} from uid=${uid}`);
      }

    } catch (e) {
      console.error(`[Pay] successful_payment ERROR uid=${uid}:`, e.message);
      // Логуємо помилку
      pool.query(`INSERT INTO payments_log (user_id, payload, stars, status) VALUES ($1,$2,$3,'error')`,
        [uid, payload, stars]).catch(() => {});
      // Алерт адміну
      try {
        await bot.sendMessage(ADMIN_ID,
          `🚨 *Помилка оплати!*\nUID: \`${uid}\`\nPayload: \`${payload}\`\nStars: ${stars}\nПомилка: ${e.message}`,
          { parse_mode: 'Markdown' }
        );
      } catch (_) {}
      // Повідомляємо юзера
      try {
        await bot.sendMessage(chatId,
          `✅ Оплата получена (${stars} ⭐), но возникла ошибка активации.\nНапишите в поддержку — мы активируем вручную.`,
          { reply_markup: { inline_keyboard: [[{ text: '💬 Поддержка', web_app: { url: webAppUrl } }]] }}
        );
      } catch (_) {}
    }
  });

  // ── Підтримка: адмін відповідає reply на повідомлення ───────────────────
  const ADMIN_ID = '369503508';
  bot.on('message', async (msg) => {
    if (String(msg.from?.id) !== ADMIN_ID) return;
    if (!msg.reply_to_message || !msg.text) return;
    const webAppUrl = process.env.WEBAPP_URL || `http://localhost:${PORT}`;
    try {
      const userId = await handleAdminReply(bot, msg.reply_to_message.message_id, msg.text, msg.message_id, webAppUrl);
      if (userId) {
        await bot.sendMessage(ADMIN_ID, `✅ Ответ отправлен (${userId})`, { reply_to_message_id: msg.message_id });
      }
    } catch (e) {
      await bot.sendMessage(ADMIN_ID, `❌ Ошибка: ${e.message}`);
    }
  });

  bot.on('polling_error', (error) => {
    console.error('[Bot] Polling error:', error.message);
  });

  // ── Щоденні сповіщення: 9:00 ранку кожен день ────────────────────────────
  // Кеш фази місяця — оновлюємо раз на день (використовується і в cron, і в /moon команді)
  let _moonCache = null;
  let _moonCacheDate = '';
  function getCachedMoon() {
    const today = new Date().toISOString().split('T')[0];
    if (_moonCacheDate !== today) {
      _moonCache = getMoonPhase(today);
      _moonCacheDate = today;
    }
    return _moonCache;
  }

  // ── Допоміжна функція: відправка батчами ─────────────────────────────────
  async function sendBatch(rows, buildMsg, webAppUrl, logTag) {
    let sent = 0, failed = 0;
    const BATCH = 25;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      await Promise.allSettled(batch.map(async user => {
        try {
          const { text, btnText } = buildMsg(user);
          await bot.sendMessage(user.user_id, text, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[
              { text: btnText || '🔮 Открыть', web_app: { url: webAppUrl } },
            ]]},
          });
          sent++;
        } catch (_) { failed++; }
      }));
      if (i + BATCH < rows.length) await new Promise(r => setTimeout(r, 1100));
    }
    console.log(`[Cron/${logTag}] відправлено ${sent}, пропущено ${failed}, всього ${rows.length}`);
  }

  // ── Щоденні сповіщення: 9:00 ─────────────────────────────────────────────
  cron.schedule('0 9 * * *', async () => {
    try {
      const webAppUrl = process.env.WEBAPP_URL || `http://localhost:${PORT}`;
      const moon = getCachedMoon();

      // Сьогоднішній MM-DD для перевірки дня народження
      const todayMD = new Date().toISOString().slice(5, 10); // "MM-DD"

      const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
      const { rows } = await pool.query(
        `SELECT user_id, first_name, birth_date FROM users
         WHERE created_at > to_timestamp($1/1000.0) AND birth_date IS NOT NULL
         LIMIT 5000`,
        [cutoff]
      );

      const defaultMsgs = [
        `🔮 Карта дня уже готова для тебя`,
        `✨ Звёзды приготовили послание на сегодня`,
        `🌟 Твоя карта дня ждёт — что скажут карты?`,
        `🃏 Начни день с Таро — открой карту дня!`,
      ];
      const moonMsg = `\n\n${moon.emoji} Луна сегодня: *${moon.name}*`;

      await sendBatch(rows, (user) => {
        const isBirthday = user.birth_date && String(user.birth_date).slice(5, 10) === todayMD;
        let text;
        if (isBirthday) {
          text = `🎂 *С Днём Рождения, ${user.first_name || 'дорогая'}!*\n\nВ твой особый день карты дают послание о судьбоносных переменах. Открой карту дня — она выбрана специально для тебя.${moonMsg}`;
        } else {
          text = `${defaultMsgs[Math.floor(Math.random() * defaultMsgs.length)]}, ${user.first_name || 'дорогая'}!${moonMsg}`;
        }
        return { text, btnText: isBirthday ? '🎂 Открыть карту дня' : '🔮 Открыть карту дня' };
      }, webAppUrl, 'morning');
    } catch (e) {
      console.error('[Cron] Помилка щоденних сповіщень:', e.message);
    }
  }, { timezone: 'Europe/Kyiv' });

  // ── Місячні сповіщення: 20:00 (тільки повнолуння / новолуння) ────────────
  cron.schedule('0 20 * * *', async () => {
    try {
      const moon = getCachedMoon();
      // Відправляємо тільки при повнолунні або новолунні
      if (moon.phase !== 'full' && moon.phase !== 'new') return;

      const webAppUrl = process.env.WEBAPP_URL || `http://localhost:${PORT}`;
      const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
      const { rows } = await pool.query(
        `SELECT user_id, first_name FROM users
         WHERE created_at > to_timestamp($1/1000.0) AND birth_date IS NOT NULL
         LIMIT 5000`,
        [cutoff]
      );

      const isFull = moon.phase === 'full';
      const moonMsgs = isFull ? [
        `🌕 *Полнолуние!* Это самое мощное время для магии и намерений.\n\nОткрой расклад — звёзды открыты для тебя, ${'{name}'}!`,
        `🌕 Сегодня *Полнолуние* — сила луны на пике!\n\nКарты говорят особенно ясно. Открой послание, ${'{name}'}`,
      ] : [
        `🌑 *Новолуние* — время новых начал и загадываний желаний.\n\nКарты Таро помогут направить энергию. Открой расклад, ${'{name}'}!`,
        `🌑 Сегодня *Новолуние* — лучший день для намерений.\n\nЧто ты хочешь привлечь в свою жизнь? Спроси карты, ${'{name}'}`,
      ];

      await sendBatch(rows, (user) => {
        const name = user.first_name || 'дорогая';
        const tmpl = moonMsgs[Math.floor(Math.random() * moonMsgs.length)];
        return {
          text: tmpl.replace('{name}', name),
          btnText: isFull ? '🌕 Открыть расклад' : '🌑 Открыть расклад',
        };
      }, webAppUrl, 'moon');
    } catch (e) {
      console.error('[Cron] Помилка місячних сповіщень:', e.message);
    }
  }, { timezone: 'Europe/Kyiv' });

  // ── Автопостинг у канал-воронку ───────────────────────────────────────────
  // CHANNEL_ID в .env: @username каналу або -100xxxxxxxxxx. Бот має бути адміном.
  const CHANNEL_ID = process.env.CHANNEL_ID;
  if (CHANNEL_ID) {
    const { MAJOR_ARCANA } = require('./config/tarotCards');

    async function getBotLink(src) {
      if (!_cachedBotUsername) { try { _cachedBotUsername = (await bot.getMe()).username; } catch (_) {} }
      return `https://t.me/${_cachedBotUsername || 'bot'}?start=src_${src}`;
    }

    // Ранковий пост: карта дня
    async function postMorningCard() {
      const webAppUrl = process.env.WEBAPP_URL || `http://localhost:${PORT}`;
      const card = MAJOR_ARCANA[Math.floor(Math.random() * MAJOR_ARCANA.length)];
      const moon = getCachedMoon();
      const botLink = await getBotLink('channel');

      const caption =
        `${card.emoji} *Карта дня — ${card.nameRu}*\n\n` +
        `${card.upright.ru}.\n\n` +
        `${card.description.ru}\n\n` +
        `${moon.emoji} Луна сегодня: *${moon.name}*\n\n` +
        `✨ Это общая карта для всех. Твоя *личная* карта дня рассчитывается по дате рождения 👇`;

      const markup = { inline_keyboard: [[{ text: '🔮 Узнать свою карту дня — бесплатно', url: botLink }]] };

      try {
        await bot.sendPhoto(CHANNEL_ID, `${webAppUrl}${card.image}`, {
          caption, parse_mode: 'Markdown', reply_markup: markup,
        });
      } catch (_) {
        // Якщо фото не доступне (localhost) — текстовий пост
        await bot.sendMessage(CHANNEL_ID, caption, { parse_mode: 'Markdown', reply_markup: markup });
      }
      console.log(`[Cron/channel] Ранковий пост: ${card.nameRu}`);
    }

    cron.schedule('0 9 * * *', async () => {
      try { await postMorningCard(); }
      catch (e) { console.error('[Cron/channel-morning]', e.message); }
    }, { timezone: 'Europe/Kyiv' });

    // /post — адмін вручну тригерить пост в канал (для перевірки)
    bot.onText(/\/post/, async (msg) => {
      if (String(msg.from?.id) !== ADMIN_ID) return;
      try {
        await postMorningCard();
        await bot.sendMessage(msg.chat.id, '✅ Пост відправлено в канал');
      } catch (e) {
        await bot.sendMessage(msg.chat.id, `❌ Помилка: ${e.message}\n\nПеревір що бот доданий адміном в канал ${CHANNEL_ID}`);
      }
    });

    // Вечірній пост: луна + ритуал (19:30)
    cron.schedule('30 19 * * *', async () => {
      try {
        const moon = getCachedMoon();
        const botLink = await getBotLink('channel');

        const text =
          `${moon.emoji} *Вечер. Луна — ${moon.name}*\n\n` +
          `${getMoonDesc(moon.energy)}\n\n` +
          `🕯️ Вечер — лучшее время для ритуалов и вопросов картам. ` +
          `Задай свой вопрос — карты ответят 👇`;

        await bot.sendMessage(CHANNEL_ID, text, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: '🌙 Спросить карты', url: botLink }]] },
        });
        console.log('[Cron/channel] Вечірній пост відправлено');
      } catch (e) { console.error('[Cron/channel-evening]', e.message); }
    }, { timezone: 'Europe/Kyiv' });

    console.log(`[Bot] Автопостинг у канал ${CHANNEL_ID} увімкнено (9:00 та 19:30)`);
  }

  // ── Retention-пуші: 11:00 — нагадування про закінчення преміуму + win-back ─
  cron.schedule('0 11 * * *', async () => {
    const webAppUrl = process.env.WEBAPP_URL || `http://localhost:${PORT}`;
    const now = Date.now();

    // Хелпер: чи можна слати цей пуш юзеру (не частіше ніж раз на 25 днів)
    async function canPush(userId, pushType) {
      const { rowCount } = await pool.query(
        `INSERT INTO push_log (user_id, push_type, created_at) VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, push_type) DO UPDATE SET created_at = NOW()
         WHERE push_log.created_at < NOW() - INTERVAL '25 days'`,
        [userId, pushType]
      );
      return rowCount > 0;
    }

    // 1) Преміум закінчується через 1-2 дні — нагадуємо продовжити
    try {
      const { rows } = await pool.query(
        `SELECT user_id, first_name, premium_expiry FROM users
         WHERE is_premium = true AND premium_expiry > $1 AND premium_expiry < $2
         LIMIT 500`,
        [now, now + 2 * 86400000]
      );
      let sent = 0;
      for (const u of rows) {
        if (!(await canPush(u.user_id, 'expire_warn'))) continue;
        const daysLeft = Math.max(1, Math.ceil((Number(u.premium_expiry) - now) / 86400000));
        try {
          await bot.sendMessage(u.user_id,
            `👑 *${u.first_name || 'Дорогая'}, твой Премиум заканчивается ${daysLeft === 1 ? 'завтра' : 'через 2 дня'}!*\n\n` +
            `Чтобы не потерять доступ к раскладам, ритуалам и лунному дневнику — продли подписку сейчас ✨`,
            {
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: [[
                { text: '👑 Продлить Премиум', web_app: { url: `${webAppUrl}?screen=premium` } }
              ]]}
            });
          sent++;
        } catch (_) {}
        await new Promise(r => setTimeout(r, 50));
      }
      if (rows.length) console.log(`[Cron/expire_warn] відправлено ${sent}/${rows.length}`);
    } catch (e) { console.error('[Cron/expire_warn]', e.message); }

    // 2) Win-back: преміум закінчився 2-4 дні тому — знижка 199⭐ на 1 місяць
    try {
      const { rows } = await pool.query(
        `SELECT user_id, first_name FROM users
         WHERE premium_expiry IS NOT NULL AND premium_expiry < $1 AND premium_expiry > $2
         LIMIT 500`,
        [now - 2 * 86400000, now - 4 * 86400000]
      );
      if (rows.length) {
        // Один invoice link на всіх — лінки Stars багаторазові
        const promoLink = await bot.createInvoiceLink(
          '🎁 Премиум со скидкой −33%',
          'Специальное предложение: 1 месяц Магического Премиума за 199 ⭐ вместо 299. Все расклады, ритуалы и AI.',
          'premium_30_promo', '', 'XTR',
          [{ label: 'Премиум 1 месяц (скидка)', amount: 199 }]
        );
        let sent = 0;
        for (const u of rows) {
          if (!(await canPush(u.user_id, 'winback'))) continue;
          try {
            await bot.sendMessage(u.user_id,
              `🔮 *${u.first_name || 'Дорогая'}, карты скучают по тебе...*\n\n` +
              `Твой Премиум закончился, но звёзды приготовили подарок:\n\n` +
              `🎁 *1 месяц за 199 ⭐ вместо 299* — скидка 33%\n` +
              `⏳ Предложение действует только *24 часа*`,
              {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: [
                  [{ text: '🎁 Забрать скидку −33%', url: promoLink }],
                  [{ text: '🔮 Открыть кабинет', web_app: { url: webAppUrl } }],
                ]}
              });
            sent++;
          } catch (_) {}
          await new Promise(r => setTimeout(r, 50));
        }
        console.log(`[Cron/winback] відправлено ${sent}/${rows.length}`);
      }
    } catch (e) { console.error('[Cron/winback]', e.message); }

    // 3) Новачки (день 2): зареєструвались, нічого не купили — м'яке нагадування
    try {
      const { rows } = await pool.query(
        `SELECT u.user_id, u.first_name FROM users u
         WHERE u.created_at BETWEEN NOW() - INTERVAL '3 days' AND NOW() - INTERVAL '2 days'
           AND COALESCE(u.is_premium, false) = false
           AND NOT EXISTS (SELECT 1 FROM payments_log p WHERE p.user_id = u.user_id AND p.status = 'success')
         LIMIT 500`
      );
      let sent = 0;
      for (const u of rows) {
        if (!(await canPush(u.user_id, 'newbie_free'))) continue;
        try {
          await bot.sendMessage(u.user_id,
            `🌟 *${u.first_name || 'Дорогая'}, твой гороскоп на неделю уже готов!*\n\n` +
            `Звёзды составили прогноз специально по твоей дате рождения — совершенно бесплатно ✨\n\n` +
            `А ещё тебя ждёт новая карта дня 🃏`,
            {
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: [[
                { text: '🌟 Открыть мой гороскоп', web_app: { url: `${webAppUrl}?screen=horoscope` } }
              ]]}
            });
          sent++;
        } catch (_) {}
        await new Promise(r => setTimeout(r, 50));
      }
      if (rows.length) console.log(`[Cron/newbie_free] відправлено ${sent}/${rows.length}`);
    } catch (e) { console.error('[Cron/newbie_free]', e.message); }

    // 4) Новачки (день 3): знижка 50% на перший розклад «Любов» — 25⭐ замість 50
    try {
      const { rows } = await pool.query(
        `SELECT u.user_id, u.first_name FROM users u
         WHERE u.created_at BETWEEN NOW() - INTERVAL '4 days' AND NOW() - INTERVAL '3 days'
           AND COALESCE(u.is_premium, false) = false
           AND NOT EXISTS (SELECT 1 FROM payments_log p WHERE p.user_id = u.user_id AND p.status = 'success')
         LIMIT 500`
      );
      if (rows.length) {
        // Один invoice link на всіх — лінки Stars багаторазові
        const offerLink = await bot.createInvoiceLink(
          '🎁 Расклад «Любовь» со скидкой −50%',
          'Только для тебя: расклад «Любовь» на 3 карты + персональное AI-толкование за 25 ⭐ вместо 50.',
          'spread:love', '', 'XTR',
          [{ label: 'Расклад «Любовь» (скидка)', amount: 25 }]
        );
        let sent = 0;
        for (const u of rows) {
          if (!(await canPush(u.user_id, 'newbie_offer'))) continue;
          try {
            await bot.sendMessage(u.user_id,
              `💝 *${u.first_name || 'Дорогая'}, подарок только для тебя!*\n\n` +
              `Карты хотят рассказать о твоей любви. Расклад «Любовь» + персональное толкование от карт:\n\n` +
              `🎁 *25 ⭐ вместо 50* — скидка 50%\n` +
              `⏳ Предложение сгорит через *24 часа*`,
              {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: [
                  [{ text: '💝 Забрать расклад за 25 ⭐', url: offerLink }],
                  [{ text: '🔮 Открыть кабинет', web_app: { url: webAppUrl } }],
                ]}
              });
            sent++;
          } catch (_) {}
          await new Promise(r => setTimeout(r, 50));
        }
        console.log(`[Cron/newbie_offer] відправлено ${sent}/${rows.length}`);
      }
    } catch (e) { console.error('[Cron/newbie_offer]', e.message); }
  }, { timezone: 'Europe/Kyiv' });

  console.log('[Bot] Telegram bot запущено');
}

// Передаємо bot в app для використання в роутах
app.set('bot', bot || null);

// ─── Routes ───────────────────────────────────────────────────────────────────
// Глобальний rate limit для всіх /api — 120 запитів/хвилину з одного IP
app.use('/api', limits.global);

// Перевірка підпису Telegram WebApp для всіх /api — кладе req.telegramUserId.
// Якщо BOT_TOKEN не заданий (dev) — пропускає. У проді блокує запити без валідного initData.
app.use('/api', verifyTelegramAuth);

app.use('/api/cards',    require('./routes/cards'));
app.use('/api/readings', limits.readings, require('./routes/readings'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/spells',   require('./routes/spells'));
app.use('/api/payments', limits.payments, require('./routes/payments'));
app.use('/api/support',  limits.support,  require('./routes/support'));
app.use('/api/ai',       limits.ai,       require('./routes/ai'));
app.use('/api/horoscope',require('./routes/horoscope'));
app.use('/api/analytics',require('./routes/analytics'));
app.use('/api/diary',    require('./routes/diary'));
app.use('/admin',        require('./routes/admin'));

// ─── Status ───────────────────────────────────────────────────────────────────
let _cachedBotUsername = null;
app.get('/api/status', async (req, res) => {
  if (!_cachedBotUsername && bot) {
    try { const me = await bot.getMe(); _cachedBotUsername = me.username; } catch (_) {}
  }
  res.json({ ok: true, version: '1.0.0', bot: !!bot, botUsername: _cachedBotUsername || process.env.BOT_USERNAME || null });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  // Payload too large (express.json limit)
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({ ok: false, error: 'payload_too_large' });
  }
  console.error('[Error]', err.message || err);
  res.status(500).json({ ok: false, error: 'internal_error' });
});

// ─── SPA fallback ─────────────────────────────────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
// Запускаємо сервер відразу, БД ініціалізуємо з ретраями
app.listen(PORT, () => console.log(`[Server] Tarot Bot запущено на http://localhost:${PORT}`));

async function initDBWithRetry(attempts = 10, delayMs = 5000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await initDB();
      console.log('[DB] Підключення успішне');
      return;
    } catch (err) {
      console.error(`[DB] Спроба ${i}/${attempts} невдала: ${err.message}`);
      if (i < attempts) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  console.error('[DB] Не вдалося підключитися до БД після всіх спроб. Перевірте DATABASE_URL.');
}

initDBWithRetry();
