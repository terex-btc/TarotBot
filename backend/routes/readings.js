'use strict';
const express = require('express');
const router  = express.Router();
const { createReading, getUserReadings, getTodayReading, SPREAD_TYPES } = require('../services/readingService');
const { loadUser, isPremiumActive } = require('./users');
const { isAdmin } = require('../config/admins');

// GET /api/readings/spreads
router.get('/spreads', (req, res) => {
  res.json({ ok: true, spreads: SPREAD_TYPES });
});

// GET /api/readings/:userId
router.get('/:userId', async (req, res) => {
  try {
    res.json({ ok: true, readings: await getUserReadings(req.params.userId, 10) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/readings/:userId
router.post('/:userId', async (req, res) => {
  try {
    const { spreadType, lang } = req.body;
    if (!spreadType) return res.status(400).json({ ok: false, error: 'spreadType required' });

    const spread = SPREAD_TYPES[spreadType];
    if (!spread) return res.status(400).json({ ok: false, error: 'Unknown spreadType' });

    const uid  = req.params.userId;
    const user = await loadUser(uid);

    // Перевірка преміум (адмін має необмежений доступ)
    if (spread.premium && !isPremiumActive(user) && !isAdmin(uid)) {
      return res.status(403).json({ ok: false, error: 'premium_required' });
    }

    if (!user?.birthDate) {
      return res.status(400).json({ ok: false, error: 'birthDate not set. Call /api/users/init first.' });
    }

    // Карта дня: кешуємо на добу (адмін не кешується)
    if ((spreadType === 'daily' || spreadType === 'three_card') && !isAdmin(uid)) {
      const cached = await getTodayReading(uid, spreadType);
      if (cached) return res.json({ ok: true, reading: cached, cached: true });
    }

    const reading = await createReading(uid, user.birthDate, spreadType, null, lang || user.lang || 'ru');
    res.json({ ok: true, reading });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
