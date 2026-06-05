'use strict';
const express = require('express');
const router  = express.Router();
const { SPELLS, CATEGORIES, DREAM_MEANINGS, getSpellsByMoonPhase, getSpellsByCategory, getSpellById, getDreamMeaning } = require('../config/spells');
const { getMoonPhase } = require('../services/algorithmService');
const { isPremiumActive, loadUser } = require('./users');
const { isAdmin } = require('../config/admins');
const { validateUserId } = require('../middleware/security');

// Валідатор userId з query або params
function validateUidParam(req, res, next) {
  const uid = req.params.userId || req.query.userId || '';
  if (uid && !/^\d{1,20}$/.test(uid)) {
    return res.status(400).json({ ok: false, error: 'invalid_userId' });
  }
  next();
}

// GET /api/spells/categories
router.get('/categories', (req, res) => {
  res.json({ ok: true, categories: CATEGORIES });
});

// GET /api/spells/today/:userId
router.get('/today/:userId', validateUserId, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const moon  = getMoonPhase(today);
    const user  = await loadUser(req.params.userId);
    const premiumOk = isPremiumActive(user) || isAdmin(req.params.userId);
    let spells = getSpellsByMoonPhase(moon.energy, 8);
    if (!premiumOk) spells = spells.map(s => ({ ...s, locked: s.premium }));
    res.json({ ok: true, moon, spells });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/spells/category/:categoryId?userId=...
router.get('/category/:categoryId', validateUidParam, async (req, res) => {
  try {
    const uid = req.query.userId || '';
    const user = await loadUser(uid);
    const premiumOk = isPremiumActive(user) || isAdmin(uid);
    const spells = getSpellsByCategory(req.params.categoryId, true)
      .map(s => ({ ...s, locked: !premiumOk && s.premium }));
    res.json({ ok: true, spells });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/spells/:id?userId=...
router.get('/:id', validateUidParam, async (req, res) => {
  try {
    const spell = getSpellById(req.params.id);
    if (!spell) return res.status(404).json({ ok: false, error: 'Not found' });

    const uid = req.query.userId || '';
    const user = await loadUser(uid);

    // Безкоштовний заговор — завжди доступний
    if (!spell.premium) return res.json({ ok: true, spell });

    // Преміум або адмін — завжди доступний
    if (isPremiumActive(user) || isAdmin(uid)) return res.json({ ok: true, spell });

    if (uid) {
      const { pool } = require('../db');

      // Перевіряємо індивідуальну покупку
      const { rows: purchased } = await pool.query(
        'SELECT 1 FROM spell_purchases WHERE user_id=$1 AND spell_id=$2',
        [uid, spell.id]
      );
      if (purchased.length) return res.json({ ok: true, spell });

      // Перевіряємо кредити (spell_pack5) — списуємо 1 кредит автоматично
      const { rows: uRows } = await pool.query(
        'SELECT spell_credits FROM users WHERE user_id=$1', [uid]
      );
      const credits = uRows[0]?.spell_credits || 0;
      if (credits > 0) {
        await pool.query(
          'UPDATE users SET spell_credits = spell_credits - 1 WHERE user_id=$1 AND spell_credits > 0',
          [uid]
        );
        await pool.query(
          'INSERT INTO spell_purchases (user_id, spell_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [uid, spell.id]
        );
        return res.json({ ok: true, spell, usedCredit: true, creditsLeft: Math.max(0, credits - 1) });
      }
    }

    return res.status(403).json({ ok: false, error: 'premium_required' });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/spells/dreams/list — всі символи
router.get('/dreams/list', (req, res) => {
  res.json({ ok: true, dreams: DREAM_MEANINGS.map(d => ({ symbol: d.symbol, positive: d.positive, card_hint: d.card_hint })) });
});

// GET /api/spells/dreams/interpret?symbol=вода&lang=ru
router.get('/dreams/interpret', validateUidParam, async (req, res) => {
  try {
    const { symbol, lang = 'ru', userId } = req.query;
    if (!symbol) return res.status(400).json({ ok: false, error: 'symbol required' });
    const user = userId ? await loadUser(userId) : null;
    const premiumOk = isPremiumActive(user) || isAdmin(userId || '');
    const result = getDreamMeaning(symbol, lang);
    if (!result) return res.json({ ok: true, found: false, message: 'Символ не знайдено в базі' });
    // Детальне тлумачення — тільки для преміум
    if (!premiumOk) {
      return res.json({ ok: true, found: true, symbol: result.symbol, positive: result.positive, card_hint: result.card_hint, preview: result.meaning.slice(0, 60) + '...', locked: true });
    }
    res.json({ ok: true, found: true, locked: false, ...result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
