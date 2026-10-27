'use strict';
const express = require('express');
const router  = express.Router();
const { pool } = require('../db');
const { isAdmin } = require('../config/admins');
const { isLunaraFreePro } = require('../middleware/security');
const { MAJOR_ARCANA } = require('../config/tarotCards');

// Безкоштовне AI-тлумачення карти дня — дозволяємо не-преміуму лише 1 раз.
// Повертає true, якщо запит можна виконати (преміум або ще не використано).
async function allowFreeDaily(userId) {
  if (!userId) return false;
  try {
    const { rows } = await pool.query(
      `SELECT is_premium, premium_expiry FROM users WHERE user_id=$1`, [String(userId)]
    );
    const u = rows[0];
    const premium = u && ((u.premium_expiry && Date.now() < Number(u.premium_expiry)) || u.is_premium);
    if (premium) return true;
    const { rows: cnt } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM activity_log WHERE user_id=$1 AND event_type='ai_free'`,
      [String(userId)]
    );
    if (cnt[0].n >= 1) return false;
    pool.query(
      `INSERT INTO activity_log (user_id, event_type, meta) VALUES ($1,'ai_free','daily')`,
      [String(userId)]
    ).catch(() => {});
    return true;
  } catch (_) {
    return true; // у разі помилки БД — не блокуємо UX
  }
}

// Преміум або адмін — для платних AI-функцій (перевірка на сервері, не тільки в клієнті)
async function isPremiumUser(userId) {
  if (!userId) return false;
  if (isAdmin(userId)) return true;
  try {
    const { rows } = await pool.query(
      `SELECT is_premium, premium_expiry FROM users WHERE user_id=$1`, [String(userId)]
    );
    const u = rows[0];
    if (!u) return false;
    if (u.premium_expiry) return Date.now() < Number(u.premium_expiry);
    return !!u.is_premium;
  } catch (_) {
    return false;
  }
}

// Мова відповіді: en / ru / ua (старий клієнт шле тільки ru/ua)
const normLang = l => (l === 'en' || l === 'ua' ? l : 'ru');

// Lazy init — щоб не крашити сервер якщо ANTHROPIC_API_KEY не задано
let _anthropic = null;
function getClient() {
  if (!_anthropic) {
    const Anthropic = require('@anthropic-ai/sdk');
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

// Rate limiter: 5 запитів/хв на юзера (in-memory, без зовнішніх залежностей)
const _rl = new Map(); // userId → [timestamp, ...]
const RL_MAX = 5, RL_WINDOW = 60_000;
function checkRateLimit(userId) {
  const now = Date.now();
  const times = (_rl.get(userId) || []).filter(t => now - t < RL_WINDOW);
  if (times.length >= RL_MAX) return false;
  times.push(now);
  _rl.set(userId, times);
  // Очищаємо старі записи кожні 1000 юзерів
  if (_rl.size > 1000) {
    for (const [k, v] of _rl) {
      if (v.every(t => now - t >= RL_WINDOW)) _rl.delete(k);
    }
  }
  return true;
}

// POST /api/ai/interpret — персональна AI-інтерпретація розкладу
router.post('/interpret', async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ ok: false, error: 'AI not configured' });
    }
    const { cards, positions, spreadName, question, userAstro, lang, freeDaily } = req.body;
    // Підписаний id власника має пріоритет — не даємо витрачати чужу квоту
    if (req.telegramUserId && req.body.userId && String(req.body.userId) !== req.telegramUserId) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    const userId = req.telegramUserId || req.body.userId;
    if (userId && !checkRateLimit(String(userId))) {
      return res.status(429).json({ ok: false, error: 'rate_limit', message: 'Не більше 5 запитів на хвилину' });
    }
    if (!cards || !cards.length) return res.status(400).json({ ok: false, error: 'cards required' });

    // Безкоштовний AI на карті дня — лише 1 раз для не-преміум юзера
    if (freeDaily && !(await allowFreeDaily(userId))) {
      return res.json({ ok: false, needPremium: true });
    }
    // Анонімні акаунти застосунку створюються безкоштовно — без преміуму AI лише через freeDaily
    if (!freeDaily && req.isAppUser && !isLunaraFreePro(req) && !(await isPremiumUser(userId))) {
      return res.status(402).json({ ok: false, error: 'premium_required' });
    }

    const l = normLang(lang);
    const en = l === 'en';

    const cardList = cards.map((c, i) => {
      const p = positions?.[i];
      const pos = p ? (typeof p === 'object' ? (p[l] || p.ru || p.en) : p) : '';
      const name = en ? c.name : l === 'ua' ? (c.nameUa || c.name) : (c.nameRu || c.name);
      const meaning = c.isReversed
        ? (c.reversed?.[l] || c.reversed?.ru || c.reversed?.en || '')
        : (c.upright?.[l] || c.upright?.ru || c.upright?.en || '');
      const rev = c.isReversed ? (en ? ' (reversed)' : ' (перевёрнута)') : '';
      return `${pos ? pos + ': ' : ''}${name}${rev} — ${meaning}`;
    }).join('\n');

    const astroInfo = userAstro ? (en ? [
      `Sign: ${userAstro.zodiac?.name}`,
      `Life path: ${userAstro.lifePath}`,
      `Personal year: ${userAstro.personalYear}`,
      `Moon phase: ${userAstro.moonPhase?.name}`,
    ] : [
      `Знак: ${userAstro.zodiac?.name}`,
      `Жизненный путь: ${userAstro.lifePath}`,
      `Личный год: ${userAstro.personalYear}`,
      `Фаза луны: ${userAstro.moonPhase?.name}`,
    ]).join(', ') : '';

    const userQuestion = question?.trim() || '';
    const spreadLabel = typeof spreadName === 'object'
      ? (spreadName[l] || spreadName.ru || spreadName.en || '')
      : (spreadName || '');

    const systemPrompt = en
      ? `You are a wise tarot reader with 30 years of experience. You give deep, personal readings that resonate. Speak warmly, with a touch of mysticism, but stay specific and practical. Address the reader as "you". This is for reflection and entertainment: never predict illness or death, and never give medical, legal or financial advice. Write in natural American English (US spelling). At most 180 words.`
      : l === 'ua'
      ? `Ти — мудрий таро-майстер з 30-річним досвідом. Даєш глибокі, персональні інтерпретації, які резонують з людиною. Говори тепло, містично, але конкретно та практично. Звертайся на "ти". Не більше 180 слів.`
      : `Ты — мудрый мастер Таро с 30-летним опытом. Даёшь глубокие, персональные интерпретации, которые резонируют с человеком. Говори тепло, мистично, но конкретно и практично. Обращайся на "ты". Не более 180 слов.`;

    const parts = en ? [`Spread: ${spreadLabel || 'Tarot reading'}`] : [`Расклад: ${spreadLabel || 'Расклад'}`];
    if (en) {
      if (astroInfo) parts.push(`Astrology: ${astroInfo}`);
      if (userQuestion) parts.push(`Question: ${userQuestion}`);
      parts.push(`\nCards:\n${cardList}`);
      parts.push(`\nGive a deep, personal reading${userQuestion ? ' in the context of this question' : ''}. Start with the overall message, then the single most important piece of advice.`);
    } else {
      if (astroInfo) parts.push(`Астрология: ${astroInfo}`);
      if (userQuestion) parts.push(`Вопрос: ${userQuestion}`);
      parts.push(`\nКарты:\n${cardList}`);
      parts.push(`\nДай глубокое персональное толкование${userQuestion ? ' в контексте этого вопроса' : ''}. Сначала общий посыл, затем главный совет.`);
    }

    const stream = getClient().messages.stream({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: parts.join('\n') }],
    });

    const finalMsg = await stream.finalMessage();
    const text = finalMsg.content.find(b => b.type === 'text')?.text || '';
    res.json({ ok: true, interpretation: text });
  } catch (e) {
    console.error('[AI] interpret error:', e.message);
    res.status(500).json({ ok: false, error: 'ai_error' });
  }
});

// POST /api/ai/practice — тренажер тлумачення: AI-вчитель оцінює тлумачення учня (застосунок)
router.post('/practice', async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ ok: false, error: 'AI not configured' });
    }
    const { cards, positions, question, answer, lang } = req.body;
    if (req.telegramUserId && req.body.userId && String(req.body.userId) !== req.telegramUserId) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    const userId = req.telegramUserId || req.body.userId;
    if (!isLunaraFreePro(req) && !(await isPremiumUser(userId))) {
      return res.status(402).json({ ok: false, error: 'premium_required' });
    }
    if (userId && !checkRateLimit(String(userId))) {
      return res.status(429).json({ ok: false, error: 'rate_limit' });
    }
    const text = String(answer || '').trim().slice(0, 1500);
    if (!Array.isArray(cards) || !cards.length || cards.length > 5 || text.length < 40) {
      return res.status(400).json({ ok: false, error: 'bad_request' });
    }
    // Карти беремо з колоди на сервері — клієнт шле лише id і перевернутість
    const lines = cards.map((c, i) => {
      const card = MAJOR_ARCANA[Number(c?.id)];
      if (!card) return null;
      const p = positions?.[i];
      const pos = p && typeof p === 'object' ? (p.en || '') : String(p || '');
      const meaning = c.isReversed ? (card.reversed?.en || '') : (card.upright?.en || '');
      return `${i + 1}. ${pos}: ${card.name}${c.isReversed ? ' (reversed)' : ''} — traditional meaning: ${meaning}`;
    });
    if (lines.includes(null)) return res.status(400).json({ ok: false, error: 'bad_request' });

    const l = normLang(lang);
    const langName = { en: 'natural American English (US spelling)', ru: 'Russian', ua: 'Ukrainian' }[l];
    const system = `You are a kind but honest tarot teacher who trains beginners in the Rider-Waite tradition. A student has interpreted a practice spread. Grade the interpretation on: (1) how well each card's meaning fits its position, (2) connecting the cards into one story, (3) answering the question, (4) a clear, practical piece of advice. Be warm and specific: praise the student's real ideas and point out exactly what to add. This is for learning and entertainment: never predict illness or death and never give medical, legal or financial advice. Write every text value in ${langName}, addressing the student as "you". Reply with one JSON object and nothing else, in exactly this shape: {"score": <integer from 1 to 10>, "good": [<1 to 3 short points>], "missed": [<1 to 3 short points>], "tip": "<one sentence>", "model": "<your own interpretation of this spread for this question, at most 110 words>"}`;
    const prompt = `Question: ${String(question || '').slice(0, 300) || '(no question)'}\nSpread:\n${lines.join('\n')}\n\nThe student's interpretation:\n"""\n${text}\n"""`;

    const msg = await getClient().messages.stream({
      model: 'claude-opus-5-5',
      max_tokens: 6000,
      thinking: { type: 'adaptive' },
      system,
      messages: [{ role: 'user', content: prompt }],
    }).finalMessage();
    const raw = msg.content.find(b => b.type === 'text')?.text || '';
    let r = null;
    try { r = JSON.parse((raw.match(/\{[\s\S]*\}/) || [raw])[0]); } catch (_) {}
    if (!r || typeof r !== 'object') return res.status(502).json({ ok: false, error: 'ai_error' });

    const list = a => (Array.isArray(a) ? a : []).map(x => String(x).trim()).filter(Boolean).slice(0, 3);
    const score = Math.max(1, Math.min(10, Math.round(Number(r.score) || 1)));
    if (userId) {
      pool.query(`INSERT INTO activity_log (user_id, event_type, meta) VALUES ($1,'ai_practice',$2)`,
        [String(userId), String(score)]).catch(() => {});
    }
    res.json({ ok: true, score, good: list(r.good), missed: list(r.missed), tip: String(r.tip || ''), model: String(r.model || '') });
  } catch (e) {
    console.error('[AI] practice error:', e.message);
    res.status(500).json({ ok: false, error: 'ai_error' });
  }
});

// POST /api/ai/chat — диалог с Оракулом
router.post('/chat', async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ ok: false, error: 'AI not configured' });
    }
    const { messages, userAstro, lang } = req.body;
    if (!messages?.length) return res.status(400).json({ ok: false, error: 'messages required' });
    if (req.telegramUserId && req.body.userId && String(req.body.userId) !== req.telegramUserId) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    const userId = req.telegramUserId || req.body.userId;

    // Оракул — тільки для преміуму (раніше перевірявся лише в клієнті)
    if (!isLunaraFreePro(req) && !(await isPremiumUser(userId))) {
      return res.status(402).json({ ok: false, error: 'premium_required' });
    }

    // Rate limit: 10 запросов/мин на юзера для чата
    const RL_CHAT_MAX = 10;
    if (userId) {
      const now = Date.now();
      const times = (_rl.get(`chat_${userId}`) || []).filter(t => now - t < RL_WINDOW);
      if (times.length >= RL_CHAT_MAX) {
        return res.status(429).json({ ok: false, error: 'rate_limit' });
      }
      times.push(now);
      _rl.set(`chat_${userId}`, times);
    }

    const l = normLang(lang);

    const astroInfo = userAstro ? [
      userAstro.zodiac?.name,
      l === 'en' ? `Life path ${userAstro.lifePath}` : `Жизненный путь ${userAstro.lifePath}`,
      userAstro.moonPhase?.name,
    ].filter(Boolean).join(', ') : '';

    const systemPrompt = l === 'en'
      ? `You are a mystical tarot Oracle with ancient wisdom. You answer briefly (2–5 sentences), with a touch of mysticism but concretely. Sometimes you refer to the cards, the stars and the phases of the moon. Address the user as "you". This is for reflection and entertainment: never predict illness or death, and never give medical, legal or financial advice. Write in natural American English (US spelling). ${astroInfo ? `User's astrology: ${astroInfo}.` : ''}`
      : l === 'ua'
      ? `Ти — містичний Оракул карт Таро з тисячолітньою мудрістю. Відповідаєш коротко (2-5 речень), містично але конкретно. Іноді посилаєшся на карти, зірки, фази місяця. Звертаєшся на "ти". ${astroInfo ? `Астрологія користувача: ${astroInfo}.` : ''}`
      : `Ты — мистический Оракул карт Таро с тысячелетней мудростью. Отвечаешь кратко (2-5 предложений), мистично но конкретно. Иногда ссылаешься на карты, звёзды, фазы луны. Обращаешься на "ты". ${astroInfo ? `Астрология пользователя: ${astroInfo}.` : ''}`;

    // Конвертируем историю сообщений в формат Anthropic
    const apiMessages = messages
      .slice(-10) // не больше 10 сообщений
      .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.content).slice(0, 500) }));

    const finalMsg = await getClient().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 250,
      system: systemPrompt,
      messages: apiMessages,
    });
    const reply = finalMsg.content.find(b => b.type === 'text')?.text || '';
    res.json({ ok: true, reply });
  } catch (e) {
    console.error('[AI] chat error:', e.message);
    res.status(500).json({ ok: false, error: 'ai_error' });
  }
});

module.exports = router;
