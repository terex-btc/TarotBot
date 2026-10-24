'use strict';
// ══ Локальний сервер для перегляду застосунку без бота й бази ═══════════════
// node mobile/dev/mock-server.js  →  http://localhost:4173/app/
// Справжня колода й алгоритм вибору карт; AI, гороскоп і БД — заглушки.
// PRO вмикається/вимикається: http://localhost:4173/mock/premium?on=1
const path    = require('path');
const express = require('express');
const { MAJOR_ARCANA: CARDS } = require('../../backend/config/tarotCards');
const { selectCards } = require('../../backend/services/algorithmService');
const { appUserIdFromDevice, signAppToken } = require('../../backend/middleware/security');

const PORT = process.env.PORT || 4173;
const app = express();
app.use(express.json());

const users = new Map();
const readings = new Map();
const freeAiUsed = new Set();
let premium = process.env.MOCK_PREMIUM === '1';

const SPREADS = {
  daily:      { name: { en: 'Card of the day', ru: 'Карта дня', ua: 'Карта дня' }, count: 1, premium: false,
    positions: [{ en: 'Your day', ru: 'Ваш день', ua: 'Ваш день' }] },
  three_card: { name: { en: 'Three cards', ru: 'Три карты', ua: 'Три карти' }, count: 3, premium: true,
    positions: [{ en: 'Past', ru: 'Прошлое', ua: 'Минуле' }, { en: 'Present', ru: 'Настоящее', ua: 'Теперішнє' }, { en: 'Future', ru: 'Будущее', ua: 'Майбутнє' }] },
  love:       { name: { en: '❤️ Love', ru: '❤️ Любовь', ua: '❤️ Кохання' }, count: 4, premium: true,
    positions: [{ en: 'Your state', ru: 'Ваше состояние', ua: 'Ваш стан' }, { en: 'Partner', ru: 'Партнёр', ua: 'Партнер' }, { en: 'Connection', ru: 'Связь', ua: 'Зв’язок' }, { en: 'Potential', ru: 'Потенциал', ua: 'Потенціал' }] },
  month:      { name: { en: '📅 Month', ru: '📅 Месяц', ua: '📅 Місяць' }, count: 4, premium: true,
    positions: [{ en: 'General energy', ru: 'Общая энергия', ua: 'Загальна енергія' }, { en: 'Challenge', ru: 'Вызов', ua: 'Виклик' }, { en: 'Opportunities', ru: 'Возможности', ua: 'Можливості' }, { en: 'Outcome', ru: 'Итог', ua: 'Підсумок' }] },
  year:       { name: { en: '🌟 Year', ru: '🌟 Год', ua: '🌟 Рік' }, count: 6, premium: true,
    positions: ['Year theme', 'Challenges', 'Opportunities', 'Love', 'Career', 'Outcome'].map(en => ({ en, ru: en, ua: en })) },
};

const pub = u => u && ({ ...u, isPremium: premium, premiumExpiry: premium ? Date.now() + 7 * 86400000 : null });

app.get('/mock/premium', (req, res) => { premium = req.query.on === '1'; res.json({ ok: true, premium }); });

app.post('/api/app/session', (req, res) => {
  const userId = appUserIdFromDevice(String(req.body.deviceId || 'x'));
  res.json({ ok: true, userId, token: signAppToken(userId) });
});
app.post('/api/analytics/event', (req, res) => res.json({ ok: true }));
app.get('/api/cards', (req, res) => res.json({ ok: true, cards: CARDS }));

app.post('/api/users/init', (req, res) => {
  const { userId, firstName, birthDate, lang } = req.body;
  const prev = users.get(userId) || { userId, createdAt: new Date().toISOString() };
  const u = { ...prev, ...(firstName && { firstName }), ...(birthDate && { birthDate }), ...(lang && { lang }) };
  users.set(userId, u);
  res.json({ ok: true, user: pub(u) });
});
app.get('/api/users/:id', (req, res) => {
  const u = users.get(req.params.id);
  if (!u) return res.status(404).json({ ok: false, error: 'User not found' });
  res.json({ ok: true, user: pub(u) });
});
app.patch('/api/users/:id', (req, res) => {
  const u = { ...users.get(req.params.id), ...req.body };
  users.set(req.params.id, u);
  res.json({ ok: true, user: pub(u) });
});
app.delete('/api/users/:id/self', (req, res) => { users.delete(req.params.id); res.json({ ok: true }); });
app.get('/api/users/:id/premium-status', (req, res) =>
  res.json({ ok: true, isPremium: premium, premiumExpiry: premium ? Date.now() + 7 * 86400000 : null }));

app.post('/api/readings/:id', (req, res) => {
  const sp = SPREADS[req.body.spreadType];
  const u = users.get(req.params.id);
  if (!sp || !u) return res.status(400).json({ ok: false, error: 'bad_request' });
  if (sp.premium && !premium) return res.status(403).json({ ok: false, error: 'premium_required' });
  const today = new Date().toISOString().slice(0, 10);
  const { cardIds, reversed } = selectCards(u.birthDate, today, req.body.spreadType + Math.random(), sp.count);
  const reading = {
    id: String(Date.now()), spreadType: req.body.spreadType, spreadName: sp.name, positions: sp.positions,
    cards: cardIds.map((id, i) => ({ ...CARDS[id], isReversed: reversed[i] })), createdAt: new Date().toISOString(),
  };
  readings.set(req.params.id, [reading, ...(readings.get(req.params.id) || [])]);
  res.json({ ok: true, reading });
});
app.get('/api/readings/:id', (req, res) => res.json({ ok: true, readings: readings.get(req.params.id) || [] }));

const AI = {
  en: 'The energy around you is shifting toward clarity. This card asks you to trust what you already know deep down and take one small, brave step today. What you nurture now will grow quickly.\n\nMain advice: slow down long enough to hear your intuition — then act on it.',
  ru: 'Энергия вокруг тебя движется к ясности. Карта просит довериться тому, что ты уже знаешь в глубине души, и сделать сегодня один маленький смелый шаг.\n\nГлавный совет: замедлись, услышь интуицию — и действуй.',
  ua: 'Енергія довкола тебе рухається до ясності. Карта просить довіритися тому, що ти вже знаєш у глибині душі, і зробити сьогодні один маленький сміливий крок.\n\nГоловна порада: сповільнись, почуй інтуїцію — і дій.',
};
app.post('/api/ai/interpret', (req, res) => {
  const uid = req.body.userId;
  if (req.body.freeDaily && !premium) {
    if (freeAiUsed.has(uid)) return res.json({ ok: false, needPremium: true });
    freeAiUsed.add(uid);
  }
  setTimeout(() => res.json({ ok: true, interpretation: AI[req.body.lang] || AI.en }), 900);
});
app.post('/api/ai/chat', (req, res) => {
  if (!premium) return res.status(402).json({ ok: false, error: 'premium_required' });
  setTimeout(() => res.json({ ok: true, reply: (AI[req.body.lang] || AI.en).split('\n')[0] }), 1100);
});
app.get('/api/app/horoscope/:sign', (req, res) => {
  const en = {
    overview: 'Today brings a gentle push forward. Conversations flow more easily than usual, and a small decision you’ve been postponing suddenly feels obvious. Trust that clarity — it won’t last forever.',
    love: 'Say the warm thing you were thinking. It lands better than you expect.',
    career: 'A fresh idea deserves a quick first draft, not a perfect plan.',
    wellbeing: 'Step outside for twenty minutes of daylight — your mood will thank you.',
    focus: 'Say yes to clarity', mood: 'Hopeful', luckyColor: 'Lavender', luckyNumber: 7,
  };
  setTimeout(() => res.json({ ok: true, sign: req.params.sign, horoscope: en }), 700);
});
app.post('/api/app/iap/sync', (req, res) => res.status(503).json({ ok: false, error: 'iap_not_configured' }));

app.use('/app', express.static(path.join(__dirname, '../www'), { etag: false, maxAge: 0 }));
app.use('/assets', express.static(path.join(__dirname, '../../frontend/assets')));
app.get('/', (req, res) => res.redirect('/app/'));

app.listen(PORT, () => console.log(`[mock] http://localhost:${PORT}/app/  (PRO: ${premium ? 'on' : 'off'})`));
