'use strict';
const express = require('express');
const router  = express.Router();
const { pool } = require('../db');
const { calcLifePath, getZodiac, getMoonPhase, calcPersonalYear, calcDayNumber } = require('../services/algorithmService');
const { bumpActivity } = require('./admin');
const { validateUserId, ownerOnly, limits } = require('../middleware/security');

// ── Хелпери ───────────────────────────────────────────────────────────────────
function isPremiumActive(user) {
  if (!user) return false;
  if (user.premium_expiry || user.premiumExpiry) {
    const expiry = user.premium_expiry || user.premiumExpiry;
    return Date.now() < Number(expiry);
  }
  return !!(user.is_premium || user.isPremium);
}

function rowToUser(row) {
  if (!row) return null;
  return {
    userId:        row.user_id,
    username:      row.username,
    firstName:     row.first_name,
    birthDate:     row.birth_date,
    lang:          row.lang,
    isPremium:     isPremiumActive(row),
    premiumExpiry: row.premium_expiry ? Number(row.premium_expiry) : null,
    refBonus:      row.ref_bonus || 0,
    astro:         row.astro,
    createdAt:     row.created_at,
  };
}

// POST /api/users/init
router.post('/init', limits.init, async (req, res) => {
  try {
    const { userId, username, firstName, name, birthDate, lang, source } = req.body;
    if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });
    // Якщо є підпис Telegram — userId мусить збігатися з ним (захист від підміни)
    if (req.telegramUserId && String(userId) !== req.telegramUserId) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    // Джерело трафіку зі start_param міні-аппи (src_xxx) — тільки first-touch
    const src = typeof source === 'string' && /^src_[\w-]{1,32}$/.test(source) ? source.slice(4) : null;

    let astro = null;
    if (birthDate) {
      try {
        const today        = new Date().toISOString().split('T')[0];
        const zodiac       = getZodiac(birthDate);
        const lifePath     = calcLifePath(birthDate);
        const personalYear = calcPersonalYear(birthDate, new Date().getFullYear());
        const moonPhase    = getMoonPhase(today);
        astro = { zodiac, lifePath, personalYear, moonPhase };
      } catch (e) { console.error('[users/init] astro calc error:', e.message); }
    }

    const fname = firstName || name || '';

    const { rows } = await pool.query(`
      INSERT INTO users (user_id, username, first_name, birth_date, lang, astro, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) DO UPDATE SET
        username   = COALESCE(NULLIF($2,''), users.username),
        first_name = COALESCE(NULLIF($3,''), users.first_name),
        birth_date = COALESCE($4, users.birth_date),
        lang       = COALESCE($5, users.lang),
        astro      = CASE WHEN $4 IS NOT NULL THEN $6 ELSE users.astro END,
        source     = COALESCE(users.source, $7),
        updated_at = NOW()
      RETURNING *, (xmax = 0) AS is_new
    `, [userId, username || '', fname, birthDate || null, lang || 'ru', astro ? JSON.stringify(astro) : null, src]);

    // Логуємо тільки нову реєстрацію
    if (rows[0]?.is_new) {
      pool.query(
        `INSERT INTO activity_log (user_id, event_type, meta) VALUES ($1,'register',$2)`,
        [userId, fname || '']
      ).catch(() => {});
      bumpActivity?.();
    }

    res.json({ ok: true, user: rowToUser(rows[0]) });
  } catch (e) {
    console.error('[users/init] error:', e.message);
    res.status(500).json({ ok: false, error: 'db_error' });
  }
});

// POST /api/users/:userId/premium
router.post('/:userId/premium', async (req, res) => {
  try {
    const { adminKey } = req.body;
    if (adminKey !== process.env.ADMIN_KEY) return res.status(403).json({ ok: false, error: 'Forbidden' });
    const { rows } = await pool.query(
      `UPDATE users SET is_premium=true, updated_at=NOW() WHERE user_id=$1 RETURNING *`,
      [req.params.userId]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'User not found' });
    res.json({ ok: true, user: rowToUser(rows[0]) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/users/:userId/premium-status
router.get('/:userId/premium-status', validateUserId, ownerOnly, async (req, res) => {
  try {
    const [{ rows }, creditsRes] = await Promise.all([
      pool.query(
        `SELECT is_premium, premium_expiry, ref_bonus, spell_credits FROM users WHERE user_id=$1`,
        [req.params.userId]
      ),
      pool.query(
        `SELECT spread_type, credits FROM spread_credits WHERE user_id=$1 AND credits > 0`,
        [req.params.userId]
      ),
    ]);
    const spreadCredits = {};
    creditsRes.rows.forEach(r => { spreadCredits[r.spread_type] = r.credits; });
    if (!rows.length) return res.json({ ok: true, isPremium: false, premiumExpiry: null, refBonus: 0, daysLeft: null, spellCredits: 0, spreadCredits });
    const user   = rows[0];
    const active = isPremiumActive(user);
    const expiry = user.premium_expiry ? Number(user.premium_expiry) : null;
    res.json({
      ok:           true,
      isPremium:    active,
      premiumExpiry: expiry,
      refBonus:     user.ref_bonus    || 0,
      spellCredits: user.spell_credits || 0,
      spreadCredits,
      daysLeft:     expiry ? Math.max(0, Math.ceil((expiry - Date.now()) / 86400000)) : null,
    });
  } catch (e) { res.json({ ok: true, isPremium: false, daysLeft: null, refBonus: 0, spellCredits: 0, spreadCredits: {} }); }
});

// GET /api/users/:userId/ref
router.get('/:userId/ref', validateUserId, ownerOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT is_premium, premium_expiry, ref_bonus FROM users WHERE user_id=$1`,
      [req.params.userId]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'User not found' });
    const u = rows[0];
    res.json({ ok: true, refBonus: u.ref_bonus || 0, premiumExpiry: u.premium_expiry, isPremium: isPremiumActive(u) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// PATCH /api/users/:userId — оновити ім'я та/або дату народження
router.patch('/:userId', validateUserId, ownerOnly, async (req, res) => {
  try {
    const { firstName, birthDate } = req.body;
    const uid = req.params.userId;
    if (!firstName && !birthDate) return res.status(400).json({ ok: false, error: 'nothing to update' });

    let astro = null;
    if (birthDate) {
      try {
        const today        = new Date().toISOString().split('T')[0];
        const { calcLifePath, getZodiac, getMoonPhase, calcPersonalYear } = require('../services/algorithmService');
        const zodiac       = getZodiac(birthDate);
        const lifePath     = calcLifePath(birthDate);
        const personalYear = calcPersonalYear(birthDate, new Date().getFullYear());
        const moonPhase    = getMoonPhase(today);
        astro = { zodiac, lifePath, personalYear, moonPhase };
      } catch (_) {}
    }

    const sets = ['updated_at=NOW()'];
    const vals = [uid];
    if (firstName) { vals.push(firstName.slice(0, 30)); sets.push(`first_name=$${vals.length}`); }
    if (birthDate) { vals.push(birthDate); sets.push(`birth_date=$${vals.length}`); }
    if (astro)     { vals.push(JSON.stringify(astro)); sets.push(`astro=$${vals.length}`); }

    const { rows } = await pool.query(
      `UPDATE users SET ${sets.join(',')} WHERE user_id=$1 RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'User not found' });
    res.json({ ok: true, user: rowToUser(rows[0]) });
  } catch (e) {
    console.error('[users/patch] error:', e.message);
    res.status(500).json({ ok: false, error: 'db_error' });
  }
});

// GET /api/users/:userId
router.get('/:userId', validateUserId, ownerOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM users WHERE user_id=$1`, [req.params.userId]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'User not found' });
    res.json({ ok: true, user: rowToUser(rows[0]) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// DELETE /api/users/:userId/self — GDPR self-delete
router.delete('/:userId/self', validateUserId, ownerOnly, async (req, res) => {
  try {
    const uid = req.params.userId;
    await pool.query(`DELETE FROM diary_entries WHERE user_id=$1`, [uid]);
    await pool.query(`DELETE FROM spell_purchases WHERE user_id=$1`, [uid]);
    await pool.query(`DELETE FROM readings WHERE user_id=$1`, [uid]);
    await pool.query(`DELETE FROM support_messages WHERE user_id=$1`, [uid]);
    await pool.query(`DELETE FROM payments_log WHERE user_id=$1`, [uid]);
    await pool.query(`DELETE FROM tg_msg_map WHERE user_id=$1`, [uid]);
    await pool.query(`DELETE FROM users WHERE user_id=$1`, [uid]);
    res.json({ ok: true });
  } catch (e) {
    console.error('[users/self-delete] error:', e.message);
    res.status(500).json({ ok: false, error: 'db_error' });
  }
});

// ── Функції для внутрішнього використання ────────────────────────────────────
async function loadUser(userId) {
  const { rows } = await pool.query(`SELECT * FROM users WHERE user_id=$1`, [userId]);
  return rows[0] ? rowToUser(rows[0]) : null;
}

async function setUserPremium(userId, expiryMs) {
  await pool.query(
    `UPDATE users SET is_premium=true, premium_expiry=$2, updated_at=NOW() WHERE user_id=$1`,
    [userId, expiryMs]
  );
}

async function addRefBonus(userId, days) {
  const now = Date.now();
  await pool.query(`
    UPDATE users SET
      ref_bonus      = ref_bonus + 1,
      is_premium     = true,
      premium_expiry = GREATEST(COALESCE(premium_expiry, $2), $2) + ($3 * 86400000),
      updated_at     = NOW()
    WHERE user_id = $1
  `, [userId, now, days]);
}

module.exports = router;
module.exports.isPremiumActive = isPremiumActive;
module.exports.loadUser        = loadUser;
module.exports.setUserPremium  = setUserPremium;
module.exports.addRefBonus     = addRefBonus;
