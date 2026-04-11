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

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const webAppUrl = process.env.WEBAPP_URL || `http://localhost:${PORT}`;

    bot.sendMessage(chatId, '🔮 Магический кабинет\n\nТаро · Заговоры · Лунный календарь\nПерсональные расклады по дате рождения.', {
      reply_markup: {
        inline_keyboard: [[
          { text: '🔮 Открыть кабинет', web_app: { url: webAppUrl } }
        ]]
      }
    });
  });

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
