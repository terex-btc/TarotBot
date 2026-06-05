'use strict';
const crypto = require('crypto');

// ─── Rate Limiter ─────────────────────────────────────────────────────────────
// In-memory, без зовнішніх залежностей. Годиться для одного процесу (Railway).
// Ключ: IP або userId. Зберігає timestamps запитів у sliding window.

class RateLimiter {
  constructor() {
    this._store = new Map();
    // Очищаємо мертві записи кожні 5 хвилин
    setInterval(() => this._cleanup(), 5 * 60_000).unref();
  }

  _cleanup() {
    const now = Date.now();
    for (const [key, entry] of this._store) {
      if (now - entry.lastSeen > 10 * 60_000) this._store.delete(key);
    }
  }

  check(key, limit, windowMs) {
    const now = Date.now();
    const entry = this._store.get(key) || { hits: [], lastSeen: now };
    entry.hits = entry.hits.filter(t => now - t < windowMs);
    if (entry.hits.length >= limit) {
      this._store.set(key, entry);
      return false; // blocked
    }
    entry.hits.push(now);
    entry.lastSeen = now;
    this._store.set(key, entry);
    return true; // allowed
  }
}

const limiter = new RateLimiter();

/**
 * Фабрика rate-limit middleware.
 * @param {number} limit   — макс. запитів
 * @param {number} windowMs — вікно в мілісекундах
 * @param {string} keyBy   — 'ip' | 'userId' | 'ip+userId'
 */
function rateLimit(limit, windowMs, keyBy = 'ip') {
  return (req, res, next) => {
    let key;
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const uid = req.params?.userId || req.body?.userId || 'anon';

    if (keyBy === 'userId')    key = `uid:${uid}`;
    else if (keyBy === 'ip+userId') key = `${ip}:${uid}`;
    else                       key = `ip:${ip}`;

    if (!limiter.check(key, limit, windowMs)) {
      return res.status(429).json({
        ok: false,
        error: 'rate_limit',
        message: 'Занадто багато запитів. Зачекайте трохи.',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }
    next();
  };
}

// ─── Telegram WebApp initData Verification ────────────────────────────────────
// Документація: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// Перевіряємо HMAC підпис initData.
// Витягуємо userId — і кладемо в req.telegramUserId.

function verifyTelegramAuth(req, res, next) {
  const BOT_TOKEN = process.env.BOT_TOKEN;

  // Якщо токен не налаштований — пропускаємо (dev-режим)
  if (!BOT_TOKEN) {
    req.telegramUserId = null;
    return next();
  }

  const initData = req.headers['x-tg-auth'] || '';

  if (!initData) {
    // Якщо немає заголовка — блокуємо доступ до /api
    return res.status(401).json({ ok: false, error: 'auth_required' });
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return res.status(401).json({ ok: false, error: 'invalid_auth' });

    params.delete('hash');

    // data_check_string: відсортовані пари key=value через \n
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    // secret_key = HMAC-SHA256("WebAppData", bot_token)
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest();

    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (expectedHash !== hash) {
      return res.status(401).json({ ok: false, error: 'invalid_auth' });
    }

    // Перевіряємо що initData не старіша 24 годин
    const authDate = Number(params.get('auth_date') || 0);
    if (Date.now() / 1000 - authDate > 86400) {
      return res.status(401).json({ ok: false, error: 'auth_expired' });
    }

    // Витягуємо userId з user JSON
    try {
      const user = JSON.parse(params.get('user') || '{}');
      req.telegramUserId = String(user.id || '');
    } catch (_) {
      req.telegramUserId = '';
    }

    next();
  } catch (e) {
    console.error('[Auth] verifyTelegramAuth error:', e.message);
    return res.status(401).json({ ok: false, error: 'invalid_auth' });
  }
}

// ─── Ownership Guard ──────────────────────────────────────────────────────────
// Перевіряємо що req.telegramUserId === req.params.userId.
// Якщо telegramUserId не заповнений (dev або бот не налаштований) — пропускаємо.

function ownerOnly(req, res, next) {
  if (!req.telegramUserId) return next(); // dev-режим або перевірка вимкнена
  if (req.telegramUserId !== req.params.userId) {
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }
  next();
}

// ─── Input Validation ─────────────────────────────────────────────────────────
// userId — тільки цифри (Telegram user id є integer)

function validateUserId(req, res, next) {
  const uid = req.params.userId || req.body?.userId;
  if (uid && !/^\d{1,20}$/.test(uid)) {
    return res.status(400).json({ ok: false, error: 'invalid_userId' });
  }
  next();
}

// ─── Presets ──────────────────────────────────────────────────────────────────
// Зручні готові набори для підключення в server.js

const limits = {
  // Загальний ліміт для всіх /api — 120 req/хв з одного IP
  global:    rateLimit(120, 60_000, 'ip'),

  // Ресурсомісткі запити (readings, ai) — 30/хв на юзера
  readings:  rateLimit(30, 60_000, 'userId'),

  // AI — дорогий ресурс — 5/хв на юзера
  ai:        rateLimit(5, 60_000, 'userId'),

  // init — реєстрація — 10/хв з IP (захист від масового брутфорсу)
  init:      rateLimit(10, 60_000, 'ip'),

  // Платежі — 10/хв на юзера
  payments:  rateLimit(10, 60_000, 'userId'),

  // Підтримка — 20/хв на юзера
  support:   rateLimit(20, 60_000, 'userId'),
};

module.exports = { rateLimit, verifyTelegramAuth, ownerOnly, validateUserId, limits };
