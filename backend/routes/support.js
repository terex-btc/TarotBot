'use strict';
const express = require('express');
const router  = express.Router();
const { pool } = require('../db');

const ADMIN_ID = '369503508';

// POST /api/support/message
router.post('/message', async (req, res) => {
  const { userId, text } = req.body;
  if (!userId || !text?.trim()) return res.status(400).json({ ok: false, error: 'userId and text required' });

  const bot = req.app.get('bot');

  // Зберігаємо повідомлення
  const id = Date.now().toString();
  await pool.query(
    `INSERT INTO support_messages (id, user_id, from_type, text) VALUES ($1,$2,'user',$3)`,
    [id, userId, text.trim()]
  );

  // Отримуємо ім'я юзера
  const { rows } = await pool.query(`SELECT first_name, username FROM users WHERE user_id=$1`, [userId]);
  const name     = rows[0]?.first_name || 'Аноним';
  const username = rows[0]?.username ? `@${rows[0].username}` : '';

  // Пересилаємо адміну
  if (bot) {
    try {
      const sent = await bot.sendMessage(ADMIN_ID,
        `💬 *Сообщение от пользователя*\n👤 ${name} ${username} (id: \`${userId}\`)\n\n${text.trim()}`,
        { parse_mode: 'Markdown' }
      );
      // Зберігаємо mapping tg_message_id → user_id для reply
      await pool.query(
        `INSERT INTO tg_msg_map (tg_message_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [sent.message_id, userId]
      );
    } catch (e) {
      console.error('[Support] Failed to forward:', e.message);
    }
  }

  res.json({ ok: true, id });
});

// GET /api/support/messages/:userId
router.get('/messages/:userId', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM support_messages WHERE user_id=$1 ORDER BY created_at ASC LIMIT 50`,
    [req.params.userId]
  );
  res.json({ ok: true, messages: rows.map(r => ({
    id: r.id, from: r.from_type, text: r.text, at: r.created_at
  }))});
});

// Функція для використання в server.js (відповідь адміна)
async function handleAdminReply(bot, replyToMsgId, replyText, adminMsgId, webAppUrl) {
  // Шукаємо userId за tg_message_id
  const { rows } = await pool.query(`SELECT user_id FROM tg_msg_map WHERE tg_message_id=$1`, [replyToMsgId]);
  if (!rows.length) return false;

  const userId = rows[0].user_id;

  // Зберігаємо відповідь
  await pool.query(
    `INSERT INTO support_messages (id, user_id, from_type, text, tg_message_id) VALUES ($1,$2,'admin',$3,$4)`,
    [Date.now().toString(), userId, replyText, adminMsgId]
  );

  // Надсилаємо юзеру
  await bot.sendMessage(userId,
    `🔮 *Ответ от Магического кабинета:*\n\n${replyText}`,
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '💬 Открыть чат', web_app: { url: `${webAppUrl}?screen=support` } }]] }
    }
  );
  return userId;
}

module.exports = router;
module.exports.handleAdminReply = handleAdminReply;
