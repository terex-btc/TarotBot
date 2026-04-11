'use strict';
const express = require('express');
const router  = express.Router();
const { SPELLS, CATEGORIES, getSpellsByMoonPhase, getSpellsByCategory, getSpellById } = require('../config/spells');
const { getMoonPhase } = require('../services/algorithmService');
const { loadUsers }    = require('./users');

// GET /api/spells/categories
router.get('/categories', (req, res) => {
  res.json({ ok: true, categories: CATEGORIES });
});

// GET /api/spells/today/:userId — заговори підходящі сьогодні за фазою місяця
router.get('/today/:userId', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const moon  = getMoonPhase(today);
  const user  = loadUsers()[req.params.userId];
  const isPremium = user?.isPremium || false;

  let spells = getSpellsByMoonPhase(moon.energy, 8);
  if (!isPremium) spells = spells.map(s => ({ ...s, locked: s.premium }));

  res.json({ ok: true, moon, spells });
});

// GET /api/spells/category/:categoryId?userId=...
router.get('/category/:categoryId', (req, res) => {
  const user = loadUsers()[req.query.userId || ''];
  const isPremium = user?.isPremium || false;
  const spells = getSpellsByCategory(req.params.categoryId, true)
    .map(s => ({ ...s, locked: !isPremium && s.premium }));
  res.json({ ok: true, spells });
});

// GET /api/spells/:id?userId=...
router.get('/:id', (req, res) => {
  const spell = getSpellById(req.params.id);
  if (!spell) return res.status(404).json({ ok: false, error: 'Not found' });

  const user = loadUsers()[req.query.userId || ''];
  const isPremium = user?.isPremium || false;
  if (spell.premium && !isPremium) {
    return res.status(403).json({ ok: false, error: 'premium_required' });
  }
  res.json({ ok: true, spell });
});

module.exports = router;
