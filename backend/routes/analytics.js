'use strict';
const express = require('express');
const router  = express.Router();
const { pool } = require('../db');
const { validateUserId } = require('../middleware/security');

// Білий список подій воронки (payment пишеться в payments_log, reading — в readingService)
const ALLOWED_EVENTS = new Set([
  'open_app',       // запуск міні-аппи
  'splash_start',   // натиснув "Почати" на splash
  'register',       // завершив реєстрацію (ім'я + дата)
  'daily_open',     // відкрив карту дня
  'daily_ai_click', // натиснув безкоштовне AI на карті дня
  'spread_open',    // відкрив екран розкладу
  'paywall_view',   // побачив paywall
  'buy_click',      // натиснув купити
  // ── Застосунок (mobile/www) ──
  'onb_slide',      // перегорнув слайд онбордингу (meta = номер)
  'onb_profile',    // ввів ім'я та дату народження
  'onb_done',       // закінчив онбординг
  'paywall_close',  // закрив paywall без покупки
  'trial_start',    // почав пробний період (meta = продукт)
  'purchase',       // успішна покупка (meta = продукт)
  'restore',        // відновив покупки
  'oracle_send',    // написав Оракулу
  'horoscope_open', // відкрив гороскоп
  'moon_open',      // відкрив місячний календар
  'card_view',      // відкрив карту в бібліотеці
  'notif_allow',    // дозволив щоденне нагадування
  'lesson_open',    // відкрив урок (meta = id)
  'lesson_done',    // пройшов урок
  'deck_read_open', // «Прочитати мою колоду»
  'deck_read_done', // отримав тлумачення своєї колоди
  'flash_open',     // картки-тренажер
]);

// POST /api/analytics/event — { userId, event, meta? }
router.post('/event', async (req, res) => {
  const { userId, event, meta } = req.body || {};
  if (!userId || !ALLOWED_EVENTS.has(event)) {
    return res.status(400).json({ ok: false, error: 'bad_event' });
  }
  try {
    await pool.query(
      `INSERT INTO activity_log (user_id, event_type, meta) VALUES ($1, $2, $3)`,
      [String(userId).slice(0, 32), event, String(meta || '').slice(0, 64)]
    );
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: true }); // аналітика не повинна ламати UX
  }
});

module.exports = router;
