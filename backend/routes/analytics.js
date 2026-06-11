'use strict';
const express = require('express');
const router  = express.Router();
const { pool } = require('../db');
const { validateUserId } = require('../middleware/security');

// Білий список подій воронки (payment пишеться в payments_log, reading — в readingService)
const ALLOWED_EVENTS = new Set(['open_app', 'paywall_view', 'buy_click']);

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
