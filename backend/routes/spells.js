'use strict';
const express = require('express');
const router  = express.Router();
const { SPELLS, CATEGORIES, getSpellsByMoonPhase, getSpellsByCategory, getSpellById } = require('../config/spells');
const { getMoonPhase } = require('../services/algorithmService');
const { isPremiumActive, loadUser } = require('./users');
const { isAdmin } = require('../config/admins');

// GET /api/spells/categories
router.get('/categories', (req, res) => {
  res.json({ ok: true, categories: CATEGORIES });
});

// GET /api/spells/today/:userId
router.get('/today/:userId', async (req, res) => {
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
router.get('/category/:categoryId', async (req, res) => {
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
router.get('/:id', async (req, res) => {
  try {
    const spell = getSpellById(req.params.id);
    if (!spell) return res.status(404).json({ ok: false, error: 'Not found' });
    const uid = req.query.userId || '';
    const user = await loadUser(uid);
    const premiumOk = isPremiumActive(user) || isAdmin(uid);
    if (spell.premium && !premiumOk) return res.status(403).json({ ok: false, error: 'premium_required' });
    res.json({ ok: true, spell });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
