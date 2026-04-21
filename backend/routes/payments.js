'use strict';
const express = require('express');
const router  = express.Router();

// Плани преміуму (ціни в Stars)
const PLANS = {
  premium_30:  { stars: 299,  days: 30,  label: '1 месяц',  emoji: '🌙' },
  premium_90:  { stars: 699,  days: 90,  label: '3 месяца', emoji: '🌟' },
  premium_365: { stars: 1990, days: 365, label: '1 год',    emoji: '👑' },
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

// GET /api/payments/plans
router.get('/plans', (req, res) => {
  res.json({ ok: true, plans: PLANS });
});

module.exports = router;
