'use strict';
// ══ /api/app — ендпоінти для застосунку (iOS / Android / web) ═══════════════
// Монтується ДО verifyTelegramAuth: тут сесія (видача токена), публічний
// гороскоп і вебхук RevenueCat — їм Telegram-підпис не потрібен.
const express = require('express');
const router  = express.Router();
const { pool } = require('../db');
const { getMoonPhase } = require('../services/algorithmService');
const { fallbackHoroscope } = require('../services/horoscopeFallback');
const {
  limits, verifyTelegramAuth, isAppUserId, appUserIdFromDevice, signAppToken,
} = require('../middleware/security');

const ENTITLEMENT_ID = process.env.REVENUECAT_ENTITLEMENT_ID || 'pro';

// ── POST /api/app/session — deviceId → userId + токен ───────────────────────
router.post('/session', limits.init, (req, res) => {
  const { deviceId } = req.body || {};
  if (typeof deviceId !== 'string' || !/^[A-Za-z0-9-]{16,64}$/.test(deviceId)) {
    return res.status(400).json({ ok: false, error: 'invalid_device' });
  }
  const userId = appUserIdFromDevice(deviceId);
  res.json({ ok: true, userId, token: signAppToken(userId) });
});

// ══ Щоденний гороскоп (AI, кеш на добу) ══════════════════════════════════════
const SIGNS = {
  aries: 'Aries', taurus: 'Taurus', gemini: 'Gemini', cancer: 'Cancer',
  leo: 'Leo', virgo: 'Virgo', libra: 'Libra', scorpio: 'Scorpio',
  sagittarius: 'Sagittarius', capricorn: 'Capricorn', aquarius: 'Aquarius', pisces: 'Pisces',
};
const LANG_NAMES = { en: 'English', ru: 'Russian', ua: 'Ukrainian' };
const MOON_EN = {
  new: 'New Moon', waxing: 'Waxing Crescent', first: 'First Quarter', gibbous: 'Waxing Gibbous',
  full: 'Full Moon', waning: 'Waning Gibbous', last: 'Last Quarter', dark: 'Waning Crescent',
};

const HOROSCOPE_SCHEMA = {
  type: 'object',
  properties: {
    overview:    { type: 'string' },
    love:        { type: 'string' },
    career:      { type: 'string' },
    wellbeing:   { type: 'string' },
    focus:       { type: 'string' },
    mood:        { type: 'string' },
    luckyColor:  { type: 'string' },
    luckyNumber: { type: 'integer' },
  },
  required: ['overview', 'love', 'career', 'wellbeing', 'focus', 'mood', 'luckyColor', 'luckyNumber'],
  additionalProperties: false,
};

const _horoCache = new Map();    // `${date}|${sign}|${lang}` → data
const _horoInFlight = new Map(); // той самий ключ → Promise (без дублів генерації)

let _anthropic = null;
function getClient() {
  if (!_anthropic) {
    const Anthropic = require('@anthropic-ai/sdk');
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

async function generateHoroscope(sign, date, lang) {
  const moon = MOON_EN[getMoonPhase(date).energy] || 'Moon';
  const day = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
  const response = await getClient().beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: HOROSCOPE_SCHEMA } },
    system:
      'You write the daily horoscope for a tarot and astrology app. Tone: warm, modern, specific and grounded — ' +
      'like a thoughtful friend, not a fortune teller. Give practical, gentle guidance. Never predict illness, death, ' +
      'accidents or guaranteed money; never give medical, legal or financial advice. Address the reader as "you".',
    messages: [{
      role: 'user',
      content:
        `Write the horoscope for ${SIGNS[sign]} for ${day}. Today's moon phase: ${moon}.\n` +
        `Write every field in ${LANG_NAMES[lang]}.\n` +
        'overview: 3–4 sentences about the overall energy of the day. love, career, wellbeing: 1–2 sentences each. ' +
        'focus: a short theme for the day, at most 5 words. mood: one or two words. luckyColor: one color. ' +
        'luckyNumber: an integer from 1 to 99.',
    }],
  });
  if (response.stop_reason === 'refusal') throw new Error('refusal');
  const text = response.content.find(b => b.type === 'text')?.text || '';
  return JSON.parse(text);
}

// GET /api/app/horoscope/:sign?lang=en&date=YYYY-MM-DD
router.get('/horoscope/:sign', async (req, res) => {
  const sign = String(req.params.sign || '').toLowerCase();
  const lang = LANG_NAMES[req.query.lang] ? req.query.lang : 'en';
  if (!SIGNS[sign]) return res.status(404).json({ ok: false, error: 'unknown_sign' });

  // Дата — локальна дата клієнта, але не далі ніж ±1 день від серверної (без генерації «на будь-яку дату»)
  const serverDate = new Date().toISOString().slice(0, 10);
  let date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : serverDate;
  if (Math.abs(new Date(date) - new Date(serverDate)) > 86400000) date = serverDate;

  const key = `${date}|${sign}|${lang}`;
  if (_horoCache.has(key)) return res.json({ ok: true, sign, date, horoscope: _horoCache.get(key) });
  // Без AI — гороскоп із шаблонів (стабільний на день), щоб екран ніколи не був порожнім
  const fallback = () => res.json({ ok: true, sign, date, horoscope: fallbackHoroscope(sign, date, lang, getMoonPhase(date).energy) });
  if (!process.env.ANTHROPIC_API_KEY) return fallback();

  try {
    if (!_horoInFlight.has(key)) {
      _horoInFlight.set(key, generateHoroscope(sign, date, lang).finally(() => _horoInFlight.delete(key)));
    }
    const data = await _horoInFlight.get(key);
    // Тримаємо тільки свіжі дні — старі ключі прибираємо
    const minDate = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    for (const k of _horoCache.keys()) if (k.slice(0, 10) < minDate) _horoCache.delete(k);
    _horoCache.set(key, data);
    res.json({ ok: true, sign, date, horoscope: data });
  } catch (e) {
    console.error('[app/horoscope] error:', e.message);
    fallback();
  }
});

// ══ Підписки: RevenueCat ═════════════════════════════════════════════════════
const GRANT_EVENTS = new Set([
  'INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE',
  'NON_RENEWING_PURCHASE', 'SUBSCRIPTION_EXTENDED', 'TEMPORARY_ENTITLEMENT_GRANT',
]);

// app_user_id у RevenueCat = наш userId (клієнт робить Purchases.logIn(userId)).
// Анонімні id RevenueCat ($RCAnonymousID:...) пропускаємо — шукаємо наш серед aliases.
function pickUserId(event) {
  const ids = [event.app_user_id, event.original_app_user_id, ...(event.aliases || [])];
  return ids.find(id => isAppUserId(id) || /^\d{1,20}$/.test(String(id || ''))) || null;
}

async function applyEntitlement(userId, expiryMs, active, meta) {
  if (active) {
    await pool.query(
      `UPDATE users SET is_premium=true, premium_expiry=$2, updated_at=NOW() WHERE user_id=$1`,
      [userId, expiryMs]
    );
  } else {
    await pool.query(
      `UPDATE users SET is_premium=false, premium_expiry=$2, updated_at=NOW() WHERE user_id=$1`,
      [userId, expiryMs || Date.now()]
    );
  }
  pool.query(
    `INSERT INTO activity_log (user_id, event_type, meta) VALUES ($1,'iap',$2)`,
    [userId, meta]
  ).catch(() => {});
}

// POST /api/app/revenuecat — вебхук (Authorization задається в дашборді RevenueCat)
router.post('/revenuecat', async (req, res) => {
  const secret = process.env.REVENUECAT_WEBHOOK_AUTH;
  const auth = req.headers.authorization || '';
  if (!secret || (auth !== secret && auth !== `Bearer ${secret}`)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  const event = req.body?.event;
  if (!event?.type) return res.status(400).json({ ok: false, error: 'no_event' });
  if (event.type === 'TEST') return res.json({ ok: true });

  const userId = pickUserId(event);
  if (!userId) return res.json({ ok: true, skipped: 'unknown_user' });

  try {
    const expiry = event.expiration_at_ms ? Number(event.expiration_at_ms) : null;
    if (GRANT_EVENTS.has(event.type)) {
      // Довічна покупка без дати закінчення — ставимо далеку дату
      await applyEntitlement(userId, expiry || Date.now() + 100 * 365 * 86400000, true, `${event.type}:${event.product_id || ''}`);
    } else if (event.type === 'EXPIRATION') {
      await applyEntitlement(userId, expiry, false, `EXPIRATION:${event.product_id || ''}`);
    }
    // CANCELLATION / BILLING_ISSUE — доступ лишається до expiration_at_ms, нічого не робимо
    res.json({ ok: true });
  } catch (e) {
    console.error('[app/revenuecat] error:', e.message);
    res.status(500).json({ ok: false, error: 'db_error' });
  }
});

// POST /api/app/iap/sync — одразу після покупки клієнт просить звірити статус
// з RevenueCat напряму (вебхук може прийти із затримкою).
router.post('/iap/sync', verifyTelegramAuth, async (req, res) => {
  const userId = req.telegramUserId;
  const key = process.env.REVENUECAT_SECRET_KEY;
  if (!userId) return res.status(401).json({ ok: false, error: 'auth_required' });
  if (!key) return res.status(503).json({ ok: false, error: 'iap_not_configured' });
  try {
    const r = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!r.ok) throw new Error(`revenuecat_${r.status}`);
    const data = await r.json();
    const ent = data?.subscriber?.entitlements?.[ENTITLEMENT_ID];
    const expiry = ent?.expires_date ? Date.parse(ent.expires_date) : (ent ? Date.now() + 100 * 365 * 86400000 : null);
    const active = !!ent && expiry > Date.now();
    if (active) await applyEntitlement(userId, expiry, true, 'SYNC');
    res.json({ ok: true, isPremium: active, premiumExpiry: active ? expiry : null });
  } catch (e) {
    console.error('[app/iap/sync] error:', e.message);
    res.status(502).json({ ok: false, error: 'sync_error' });
  }
});

// ══ Демо-доступ ══════════════════════════════════════════════════════════════
// Посилання /app/?demo=<DEMO_CODE> вмикає PRO на 7 днів на цьому пристрої —
// щоб показувати застосунок спонсорам/друзям. Код міняється в Railway Variables.
const DEMO_DAYS = 7;
router.post('/demo-unlock', limits.init, verifyTelegramAuth, async (req, res) => {
  const code = String(req.body?.code || '');
  const expected = process.env.DEMO_CODE || '';
  const userId = req.telegramUserId;
  if (!userId) return res.status(401).json({ ok: false, error: 'auth_required' });
  if (!expected || code.length !== expected.length ||
      !require('crypto').timingSafeEqual(Buffer.from(code), Buffer.from(expected))) {
    return res.status(403).json({ ok: false, error: 'invalid_code' });
  }
  try {
    const expiry = Date.now() + DEMO_DAYS * 86400000;
    // Рядка юзера може ще не бути (онбординг попереду) — створюємо; /users/init потім доповнить
    await pool.query(`
      INSERT INTO users (user_id, is_premium, premium_expiry) VALUES ($1, true, $2)
      ON CONFLICT (user_id) DO UPDATE SET
        is_premium = true,
        premium_expiry = GREATEST(COALESCE(users.premium_expiry, 0), $2),
        updated_at = NOW()
    `, [userId, expiry]);
    pool.query(`INSERT INTO activity_log (user_id, event_type, meta) VALUES ($1,'iap','DEMO')`, [userId]).catch(() => {});
    res.json({ ok: true, premiumExpiry: expiry });
  } catch (e) {
    console.error('[app/demo-unlock] error:', e.message);
    res.status(500).json({ ok: false, error: 'db_error' });
  }
});

module.exports = router;
