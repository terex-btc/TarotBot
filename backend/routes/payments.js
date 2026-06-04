'use strict';
const express = require('express');
const router  = express.Router();
const { setUserPremium, loadUser } = require('./users');
const { pool } = require('../db');

// Плани преміуму (ціни в Stars)
const PLANS = {
  premium_30:  { stars: 299,  days: 30,  label: '1 месяц',  emoji: '🌙', type: 'subscription' },
  premium_90:  { stars: 699,  days: 90,  label: '3 месяца', emoji: '🌟', type: 'subscription' },
  premium_365: { stars: 1990, days: 365, label: '1 год',    emoji: '👑', type: 'subscription' },
};

// Мікроплатежі — окремі заговори
const SPELL_PURCHASES = {
  spell_single: { stars: 30, label: 'Один заговор', emoji: '🕯️', type: 'spell' },
  spell_pack5:  { stars: 99, label: '5 заговоров',  emoji: '✨', type: 'spell_pack', count: 5 },
};

// POST /api/payments/invoice
// Створює інвойс через Telegram bot і повертає invoice link
router.post('/invoice', async (req, res) => {
  const { planId, userId } = req.body;
  if (!planId || !userId) return res.status(400).json({ ok: false, error: 'planId and userId required' });

  const plan = PLANS[planId];
  if (!plan) return res.status(400).json({ ok: false, error: 'Unknown plan' });

  const bot = req.app.get('bot');
  if (!bot) return res.status(503).json({ ok: false, error: 'Bot not initialized' });

  try {
    const link = await bot.createInvoiceLink(
      `${plan.emoji} Магический Премиум — ${plan.label}`,
      `Все расклады Таро, заговоры и ритуалы на ${plan.days} дней. Персонально по вашей дате рождения.`,
      planId,          // payload — обробляємо в successful_payment
      'XTR',           // Telegram Stars
      [{ label: `Премиум ${plan.label}`, amount: plan.stars }]
    );
    res.json({ ok: true, link });
  } catch (e) {
    console.error('[Payments] Error creating invoice:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/payments/invoice/spell — купити один заговор або пак
router.post('/invoice/spell', async (req, res) => {
  const { purchaseId, userId, spellId } = req.body;
  if (!purchaseId || !userId) return res.status(400).json({ ok: false, error: 'purchaseId and userId required' });

  const purchase = SPELL_PURCHASES[purchaseId];
  if (!purchase) return res.status(400).json({ ok: false, error: 'Unknown purchaseId' });

  const bot = req.app.get('bot');
  if (!bot) return res.status(503).json({ ok: false, error: 'Bot not initialized' });

  try {
    const payload = purchaseId === 'spell_single'
      ? `spell:${spellId || 'unknown'}`
      : 'spell_pack5';
    const link = await bot.createInvoiceLink(
      `${purchase.emoji} ${purchase.label}`,
      purchaseId === 'spell_single'
        ? 'Купить один заговор и получить доступ к нему навсегда.'
        : 'Купить 5 любых заговоров из базы.',
      payload,
      'XTR',
      [{ label: purchase.label, amount: purchase.stars }]
    );
    res.json({ ok: true, link });
  } catch (e) {
    console.error('[Payments] Spell invoice error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/payments/grant-spell — видати доступ до заговору після оплати
router.post('/grant-spell', async (req, res) => {
  const { userId, spellId } = req.body;
  if (!userId || !spellId) return res.status(400).json({ ok: false, error: 'userId and spellId required' });
  try {
    await pool.query(
      `INSERT INTO spell_purchases (user_id, spell_id, purchased_at)
       VALUES ($1, $2, NOW()) ON CONFLICT (user_id, spell_id) DO NOTHING`,
      [userId, spellId]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/payments/my-spells/:userId — які заговори куплені
router.get('/my-spells/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT spell_id FROM spell_purchases WHERE user_id = $1',
      [req.params.userId]
    );
    res.json({ ok: true, spells: result.rows.map(r => r.spell_id) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/payments/plans
router.get('/plans', (req, res) => {
  res.json({ ok: true, plans: { ...PLANS, ...SPELL_PURCHASES } });
});

module.exports = router;
module.exports.SPELL_PURCHASES = SPELL_PURCHASES;
