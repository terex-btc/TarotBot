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

  bot.on('polling_error', (error) => {
    console.error('[Bot] Polling error:', error.message);
  });

  console.log('[Bot] Telegram bot запущено');
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/cards', require('./routes/cards'));
app.use('/api/readings', require('./routes/readings'));
app.use('/api/users', require('./routes/users'));
app.use('/api/spells', require('./routes/spells'));

// ─── Status ───────────────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({ ok: true, version: '1.0.0', bot: !!bot });
});

// ─── SPA fallback ─────────────────────────────────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Server] Tarot Bot запущено на http://localhost:${PORT}`);
});
