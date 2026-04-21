require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

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
    const chatId = msg.chat.id;
    const refUserId = match[1];
    const webAppUrl = process.env.WEBAPP_URL || `http://localhost:${PORT}`;

    if (String(chatId) === refUserId) return; // сам себе не може запросити

    // Активуємо 1 день преміум рефереру
    const { loadUsers, saveUsersFromServer } = require('./routes/users');
    const users = loadUsers();
    if (users[refUserId]) {
      const now = Date.now();
      const currentExpiry = users[refUserId].premiumExpiry || now;
      const base = Math.max(currentExpiry, now);
      users[refUserId].premiumExpiry = base + 24 * 60 * 60 * 1000; // +1 день
      users[refUserId].isPremium = true;
      users[refUserId].refBonus = (users[refUserId].refBonus || 0) + 1;
      saveUsersFromServer(users);
      try {
        await bot.sendMessage(refUserId,
          `🎉 Твоя подруга присоединилась к Магическому кабинету!\n✨ Тебе начислен *1 день Премиума* в подарок 🔮`,
          { parse_mode: 'Markdown' }
        );
      } catch (_) {}
    }

    // Стандартне привітання для нового юзера
    const name = msg.from?.first_name || 'Дорогая';
    const welcome = `🔮 *Добро пожаловать, ${name}!*\n\nТебя пригласила подруга — и звёзды уже ждут тебя!\n\n✨ Открой Магический кабинет и получи карту дня 👇`;
    await bot.sendMessage(chatId, welcome, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🔮 Открыть Магический кабинет', web_app: { url: webAppUrl } }]] }
    });
  });

  // ── Платежі Telegram Stars ─────────────────────────────────────────────────
  bot.on('pre_checkout_query', async (query) => {
    await bot.answerPreCheckoutQuery(query.id, true);
  });

  bot.on('successful_payment', async (msg) => {
    const chatId  = msg.chat.id;
    const payload = msg.successful_payment.invoice_payload;
    const stars   = msg.successful_payment.total_amount;

    if (payload.startsWith('premium_')) {
      const days = payload === 'premium_30' ? 30 : payload === 'premium_90' ? 90 : 365;
      const { loadUsers, saveUsersFromServer } = require('./routes/users');
      const users = loadUsers();
      const uid   = String(chatId);
      if (!users[uid]) users[uid] = { userId: uid, isPremium: false };
      const now  = Date.now();
      const base = Math.max(users[uid].premiumExpiry || now, now);
      users[uid].premiumExpiry = base + days * 24 * 60 * 60 * 1000;
      users[uid].isPremium = true;
      saveUsersFromServer(users);

      const webAppUrl = process.env.WEBAPP_URL || `http://localhost:${PORT}`;
      await bot.sendMessage(chatId,
        `👑 *Премиум активирован!*\n\n🌟 ${stars} Stars — оплачено\n✨ Срок: *${days} дней*\n\nТеперь тебе доступны все расклады, заговоры и ритуалы без ограничений!`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: '🔮 Открыть кабинет', web_app: { url: webAppUrl } }]] }
        }
      );
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

// ─── Status ───────────────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({ ok: true, version: '1.0.0', bot: !!bot, botUsername: process.env.BOT_USERNAME || null });
});

// ─── SPA fallback ─────────────────────────────────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Server] Tarot Bot запущено на http://localhost:${PORT}`);
});
