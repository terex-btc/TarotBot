'use strict';
const express = require('express');
const router  = express.Router();
const { createReading, getUserReadings, getTodayReading, getReadingByLocalDate, updateReadingJournal, SPREAD_TYPES } = require('../services/readingService');
const { loadUser, isPremiumActive } = require('./users');
const { isAdmin } = require('../config/admins');
const { validateUserId, ownerOnly, isLunaraFreePro } = require('../middleware/security');
const { pool } = require('../db');

// Атомарно списуємо 1 кредит разового розкладу. Повертає true якщо списали.
async function useSpreadCredit(userId, spreadType) {
  const { rowCount } = await pool.query(
    `UPDATE spread_credits SET credits = credits - 1
     WHERE user_id = $1 AND spread_type = $2 AND credits > 0`,
    [userId, spreadType]
  );
  return rowCount > 0;
}

// GET /api/readings/spreads
router.get('/spreads', (req, res) => {
  res.json({ ok: true, spreads: SPREAD_TYPES });
});

// GET /api/readings/:userId
router.get('/:userId', validateUserId, ownerOnly, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    res.json({ ok: true, readings: await getUserReadings(req.params.userId, limit) });
  } catch (e) {
    console.error('[readings]', e.message);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// POST /api/readings/:userId
router.post('/:userId', validateUserId, ownerOnly, async (req, res) => {
  try {
    const { spreadType, lang, fresh } = req.body;
    // Застосунок (Lunara) просить нову розкладку на кожне питання; старий бот — ні
    const freshDraw = fresh === true && spreadType !== 'daily';
    if (!spreadType) return res.status(400).json({ ok: false, error: 'spreadType required' });

    const spread = SPREAD_TYPES[spreadType];
    if (!spread) return res.status(400).json({ ok: false, error: 'Unknown spreadType' });

    const uid  = req.params.userId;
    const user = await loadUser(uid);

    // Перевірка преміум (адмін має необмежений доступ).
    // Без преміуму — пробуємо списати куплений разовий кредит на цей розклад.
    if (spread.premium && !isPremiumActive(user) && !isAdmin(uid) && !isLunaraFreePro(req)) {
      const usedCredit = await useSpreadCredit(uid, spreadType).catch(() => false);
      if (!usedCredit) {
        return res.status(403).json({ ok: false, error: 'premium_required' });
      }
    }

    if (!user?.birthDate) {
      return res.status(400).json({ ok: false, error: 'birthDate not set. Call /api/users/init first.' });
    }

    // Lunara шле свою місцеву дату — карта дня змінюється опівночі в користувача, а не за UTC
    const ld = req.body.localDate;
    const localDate = spreadType === 'daily' && /^\d{4}-\d{2}-\d{2}$/.test(ld || '') &&
      Math.abs(Date.parse(ld) - Date.now()) < 2 * 86400000 ? ld : null;
    if (localDate && !isAdmin(uid)) {
      const cached = await getReadingByLocalDate(uid, 'daily', localDate);
      if (cached) return res.json({ ok: true, reading: cached, cached: true });
      const reading = await createReading(uid, user.birthDate, 'daily', localDate, lang || user.lang || 'ru', { localDate });
      return res.json({ ok: true, reading });
    }

    // Карта дня: кешуємо на добу (адмін не кешується)
    if ((spreadType === 'daily' || spreadType === 'three_card') && !isAdmin(uid) && !freshDraw) {
      const cached = await getTodayReading(uid, spreadType);
      if (cached) return res.json({ ok: true, reading: cached, cached: true });
    }

    const reading = await createReading(uid, user.birthDate, spreadType, null, lang || user.lang || 'ru',
      { salt: freshDraw ? `${Date.now()}` : '' });
    res.json({ ok: true, reading });
  } catch (e) {
    console.error('[readings]', e.message);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// PATCH /api/readings/:userId/:readingId — нотатка, настрій, «чи справдилось»
const MOODS = new Set(['', 'great', 'good', 'calm', 'anxious', 'sad']);
const OUTCOMES = new Set(['', 'yes', 'partly', 'no']);
router.patch('/:userId/:readingId', validateUserId, ownerOnly, async (req, res) => {
  try {
    const { note, mood, outcome } = req.body || {};
    if (mood !== undefined && !MOODS.has(mood)) return res.status(400).json({ ok: false, error: 'bad_mood' });
    if (outcome !== undefined && !OUTCOMES.has(outcome)) return res.status(400).json({ ok: false, error: 'bad_outcome' });
    if (!/^\d{1,20}$/.test(req.params.readingId)) return res.status(400).json({ ok: false, error: 'bad_id' });
    const reading = await updateReadingJournal(req.params.userId, req.params.readingId, {
      note: typeof note === 'string' ? note.slice(0, 2000) : null,
      mood: mood ?? null, outcome: outcome ?? null,
    });
    if (!reading) return res.status(404).json({ ok: false, error: 'not_found' });
    res.json({ ok: true, reading });
  } catch (e) {
    console.error('[readings]', e.message);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

module.exports = router;
