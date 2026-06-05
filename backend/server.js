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

// CORS — дозволяємо тільки Telegram WebApp та localhost для dev
app.use(cors({
  origin: (origin, cb) => {
    // Telegram відкриває WebApp без origin (або з web.telegram.org/tgwebapp)
    if (!origin || origin.includes('telegram') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return cb(null, true);
    }
    cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-Tg-Auth'],
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
        const days = payload === 'premium_30' ? 30 : payload === 'premium_90' ? 90 : 365;

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

  cron.schedule('0 9 * * *', async () => {
    try {
      const webAppUrl = process.env.WEBAPP_URL || `http://localhost:${PORT}`;
      const moon = getCachedMoon();

      // Вибираємо активних юзерів (реєструвалися за останні 60 днів)
      const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
      const { rows } = await pool.query(
        `SELECT user_id, first_name FROM users
         WHERE created_at > to_timestamp($1/1000.0) AND birth_date IS NOT NULL
         LIMIT 5000`,
        [cutoff]
      );

      const msgs = [
        `🔮 Карта дня уже готова для тебя`,
        `✨ Звёзды приготовили послание на сегодня`,
        `🌟 Твоя карта дня ждёт — что скажут карты?`,
        `🃏 Начни день с Таро — открой карту дня!`,
      ];
      const moonMsg = `\n\n${moon.emoji} Луна сегодня: *${moon.name}*`;

      let sent = 0, failed = 0;
      // Telegram дозволяє ~30 msg/сек. Відправляємо батчами по 25 з паузою 1 сек.
      const BATCH = 25;
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        await Promise.allSettled(batch.map(async user => {
          try {
            const greeting = `${msgs[Math.floor(Math.random() * msgs.length)]}, ${user.first_name || 'дорогая'}!${moonMsg}`;
            await bot.sendMessage(user.user_id, greeting, {
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: [[
                { text: '🔮 Открыть карту дня', web_app: { url: webAppUrl } },
              ]]},
            });
            sent++;
          } catch (_) { failed++; } // юзер заблокував бота
        }));
        if (i + BATCH < rows.length) await new Promise(r => setTimeout(r, 1100));
      }
      console.log(`[Cron] Сповіщення: відправлено ${sent}, пропущено ${failed}, всього ${rows.length}`);
    } catch (e) {
      console.error('[Cron] Помилка щоденних сповіщень:', e.message);
    }
  }, { timezone: 'Europe/Kyiv' });

  console.log('[Bot] Telegram bot запущено');
}

// Передаємо bot в app для використання в роутах
app.set('bot', bot || null);

// ─── Routes ───────────────────────────────────────────────────────────────────
// Глобальний rate limit для всіх /api — 120 запитів/хвилину з одного IP
app.use('/api', limits.global);

app.use('/api/cards',    require('./routes/cards'));
app.use('/api/readings', limits.readings, require('./routes/readings'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/spells',   require('./routes/spells'));
app.use('/api/payments', limits.payments, require('./routes/payments'));
app.use('/api/support',  limits.support,  require('./routes/support'));
app.use('/api/ai',       limits.ai,       require('./routes/ai'));
app.use('/api/horoscope',require('./routes/horoscope'));
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
