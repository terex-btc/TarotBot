'use strict';
const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const { loadUsers } = require('./users');
const { isAdmin }   = require('../config/admins');

const ADMIN_ID = '369503508';
const CHATS_PATH = path.join(__dirname, '../storage/support_chats.json');

function loadChats() {
  try { return JSON.parse(fs.readFileSync(CHATS_PATH, 'utf8')); } catch { return {}; }
}
function saveChats(data) {
  fs.writeFileSync(CHATS_PATH, JSON.stringify(data, null, 2));
}

// POST /api/support/message — юзер надсилає повідомлення
router.post('/message', async (req, res) => {
  const { userId, text } = req.body;
  if (!userId || !text?.trim()) return res.status(400).json({ ok: false, error: 'userId and text required' });

  const bot = req.app.get('bot');
  const users = loadUsers();
  const user = users[userId];
  const name = user?.firstName || 'Аноним';
  const username = user?.username ? `@${user.username}` : '';

  // Зберігаємо повідомлення
  const chats = loadChats();
  if (!chats[userId]) chats[userId] = { messages: [] };
  const msgId = Date.now().toString();
  chats[userId].messages.push({ id: msgId, from: 'user', text: text.trim(), at: new Date().toISOString() });
  saveChats(chats);

  // Пересилаємо адміну
  if (bot) {
    try {
      const sent = await bot.sendMessage(ADMIN_ID,
        `💬 *Сообщение от пользователя*\n👤 ${name} ${username} (id: \`${userId}\`)\n\n${text.trim()}`,
        { parse_mode: 'Markdown' }
      );
      // Зберігаємо mapping: message_id → userId (щоб знати кому відповідати)
      chats[userId].lastAdminMsgId = sent.message_id;
      chats[`msg_${sent.message_id}`] = userId; // зворотній lookup
      saveChats(chats);
    } catch (e) {
      console.error('[Support] Failed to forward:', e.message);
    }
  }

  res.json({ ok: true, msgId });
});

// GET /api/support/messages/:userId — отримати историю для юзера
router.get('/messages/:userId', (req, res) => {
  const chats = loadChats();
  const msgs = (chats[req.params.userId]?.messages || []).slice(-30);
  res.json({ ok: true, messages: msgs });
});

module.exports = router;
module.exports.loadChats = loadChats;
module.exports.saveChats = saveChats;
