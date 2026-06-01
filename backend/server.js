require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const TelegramBot = require('node-telegram-bot-api');
const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

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

    const { getMoonPhase } = require('./services/algorithmService');
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
    const refLink = `https://t.me/${(await bot.getMe()).username}?start=ref_${chatId}`;
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

    const { addRefBonus } = require('./routes/users');
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
  bot.on('pre_checkout_query', async (query) => {
    await bot.answerPreCheckoutQuery(query.id, true);
  });

  bot.on('successful_payment', async (msg) => {
    const chatId  = msg.chat.id;
    const payload = msg.successful_payment.invoice_payload;
    const stars   = msg.successful_payment.total_amount;

    const webAppUrl = process.env.WEBAPP_URL || `http://localhost:${PORT}`;
    const uid = String(chatId);
    const { setUserPremium } = require('./routes/users');
    const { pool } = require('./db');

    // Upsert юзера
    await pool.query(`INSERT INTO users (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [uid]);

    if (payload.startsWith('premium_')) {
      const days = payload === 'premium_30' ? 30 : payload === 'premium_90' ? 90 : 365;
      const { rows } = await pool.query(`SELECT premium_expiry FROM users WHERE user_id=$1`, [uid]);
      const base = Math.max(rows[0]?.premium_expiry ? Number(rows[0].premium_expiry) : Date.now(), Date.now());
      await setUserPremium(uid, base + days * 86400000);

      await bot.sendMessage(chatId,
        `👑 *Премиум активирован!*\n\n⭐ ${stars} Stars — оплачено\n✨ Срок: *${days} дней*\n\nТеперь тебе доступны все расклады и заговоры без ограничений!`,
        { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔮 Открыть кабинет', web_app: { url: webAppUrl } }]] } }
      );

    } else if (payload.startsWith('{')) {
      // JSON payload — мікроплатіж за заговор
      try {
        const data = JSON.parse(payload);
        if (data.type === 'spell' && data.spellId) {
          await pool.query(
            `INSERT INTO spell_purchases (user_id, spell_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [uid, data.spellId]
          );
          await bot.sendMessage(chatId,
            `🕯️ *Заговор куплен!*\n\n⭐ ${stars} Stars — оплачено\n✨ Теперь откройте приложение и найдите ваш заговор — он разблокирован!`,
            { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔮 Открыть кабинет', web_app: { url: webAppUrl } }]] } }
          );
        } else if (data.type === 'spell_pack') {
          // 5 кредитів на заговори
          await pool.query(
            `UPDATE users SET spell_credits = COALESCE(spell_credits, 0) + 5 WHERE user_id = $1`,
            [uid]
          );
          await bot.sendMessage(chatId,
            `✨ *Пак заговоров куплен!*\n\n⭐ ${stars} Stars — оплачено\n🕯️ *5 заговоров* добавлено на ваш счёт!\n\nОткройте любой заговор в приложении — он спишется автоматически.`,
            { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔮 Открыть кабинет', web_app: { url: webAppUrl } }]] } }
          );
        }
      } catch (e) {
        console.error('[Payments] JSON payload parse error:', e.message);
      }
    }
  });

  // ── Підтримка: адмін відповідає reply на повідомлення ───────────────────
  const ADMIN_ID = '369503508';
  bot.on('message', async (msg) => {
    if (String(msg.from?.id) !== ADMIN_ID) return;
    if (!msg.reply_to_message || !msg.text) return;
    const { handleAdminReply } = require('./routes/support');
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

  console.log('[Bot] Telegram bot запущено');
}

// Передаємо bot в app для використання в роутах
app.set('bot', bot || null);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/cards', require('./routes/cards'));
app.use('/api/readings', require('./routes/readings'));
app.use('/api/users', require('./routes/users'));
app.use('/api/spells', require('./routes/spells'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/support', require('./routes/support'));

// ─── Status ───────────────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({ ok: true, version: '1.0.0', bot: !!bot, botUsername: process.env.BOT_USERNAME || null });
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
