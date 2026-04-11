'use strict';
const express = require('express');
const router = express.Router();
const { MAJOR_ARCANA } = require('../config/tarotCards');

// GET /api/cards — всі карти
router.get('/', (req, res) => {
  res.json({ ok: true, cards: MAJOR_ARCANA });
});

// GET /api/cards/:id — одна карта
router.get('/:id', (req, res) => {
  const card = MAJOR_ARCANA.find(c => c.id === parseInt(req.params.id));
  if (!card) return res.status(404).json({ ok: false, error: 'Card not found' });
  res.json({ ok: true, card });
});

// GET /api/cards/random — випадкова карта
router.get('/draw/random', (req, res) => {
  const card = MAJOR_ARCANA[Math.floor(Math.random() * MAJOR_ARCANA.length)];
  const reversed = Math.random() > 0.7; // 30% шанс перевернутої
  res.json({ ok: true, card, reversed });
});

module.exports = router;
