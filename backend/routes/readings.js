'use strict';
const express = require('express');
const router = express.Router();
const { createReading, getUserReadings, getTodayReading, SPREAD_TYPES } = require('../services/readingService');
const { loadUsers } = require('./users');
const { isAdmin } = require('../config/admins');

// GET /api/readings/spreads
router.get('/spreads', (req, res) => {
  res.json({ ok: true, spreads: SPREAD_TYPES });
});

// GET /api/readings/:userId
router.get('/:userId', (req, res) => {
  try {
    res.json({ ok: true, readings: getUserReadings(req.params.userId, 10) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/readings/:userId
router.post('/:userId', (req, res) => {
  try {
    const { spreadType, lang } = req.body;
    if (!spreadType) return res.status(400).json({ ok: false, error: 'spreadType required' });

    const spread = SPREAD_TYPES[spreadType];
    if (!spread) return res.status(400).json({ ok: false, error: 'Unknown spreadType' });

    // Перевірка преміум (адмін має необмежений доступ)
    const user = loadUsers()[req.params.userId];
    if (spread.premium && !user?.isPremium && !isAdmin(req.params.userId)) {
      return res.status(403).json({ ok: false, error: 'premium_required' });
    }

    if (!user?.birthDate) {
      return res.status(400).json({ ok: false, error: 'birthDate not set. Call /api/users/init first.' });
    }

    // Карта дня: кешуємо на добу
    if (spreadType === 'daily' || spreadType === 'three_card') {
      const cached = getTodayReading(req.params.userId, spreadType);
      if (cached) return res.json({ ok: true, reading: cached, cached: true });
    }

    const reading = createReading(req.params.userId, user.birthDate, spreadType, null, lang || user.lang || 'ua');
    res.json({ ok: true, reading });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
