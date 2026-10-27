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
const { SPREAD_TYPES } = require('../../backend/services/readingService');
const { fallbackHoroscope } = require('../../backend/services/horoscopeFallback');
const { getMoonPhase } = require('../../backend/services/algorithmService');

const PORT = process.env.PORT || 4173;
const app = express();
app.use(express.json());

const users = new Map();
const readings = new Map();
const freeAiUsed = new Set();
let premium = process.env.MOCK_PREMIUM === '1';

const SPREADS = Object.fromEntries(Object.entries(SPREAD_TYPES).map(([k, v]) => [k, { name: v.name, count: v.count, premium: v.premium, positions: v.positions }]));

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
  if (req.body.spreadType === 'daily' && req.body.localDate) {
    const prev = (readings.get(req.params.id) || []).find(r => r.spreadType === 'daily' && r.localDate === req.body.localDate);
    if (prev) return res.json({ ok: true, reading: prev, cached: true });
  }
  const { cardIds, reversed } = selectCards(u.birthDate, today, req.body.spreadType + Math.random(), sp.count);
  const reading = {
    id: String(Date.now()), spreadType: req.body.spreadType, spreadName: sp.name, positions: sp.positions,
    cards: cardIds.map((id, i) => ({ ...CARDS[id], isReversed: reversed[i] })), createdAt: new Date().toISOString(),
    localDate: req.body.localDate || null, note: '', mood: '', outcome: '',
  };
  readings.set(req.params.id, [reading, ...(readings.get(req.params.id) || [])]);
  res.json({ ok: true, reading });
});
app.get('/api/readings/:id', (req, res) => res.json({ ok: true, readings: (readings.get(req.params.id) || []).slice(0, Number(req.query.limit) || 10) }));
app.patch('/api/readings/:id/:rid', (req, res) => {
  const r = (readings.get(req.params.id) || []).find(x => x.id === req.params.rid);
  if (!r) return res.status(404).json({ ok: false, error: 'not_found' });
  for (const k of ['note', 'mood', 'outcome']) if (req.body[k] !== undefined) r[k] = req.body[k];
  res.json({ ok: true, reading: r });
});

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
// Тренажер тлумачення — заглушка AI-вчителя
app.post('/api/ai/practice', (req, res) => {
  if (!premium) return res.status(402).json({ ok: false, error: 'premium_required' });
  if (String(req.body.answer || '').trim().length < 40) return res.status(400).json({ ok: false, error: 'bad_request' });
  setTimeout(() => res.json({ ok: true, score: 7,
    good: ['You read the first card in its position correctly', 'You connected the cards into one story'],
    missed: ['Say how the reversed card changes the advice', 'Answer the question directly in one sentence'],
    tip: 'Start with the overall mood of the spread, then go card by card.',
    model: 'The past card shows the energy you are coming from; the present card is the challenge you face now; the future card points to a hopeful turn if you act on the advice. In short: let go of the old worry and take one practical step this week.',
  }), 1400);
});
app.get('/api/app/horoscope/:sign', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  setTimeout(() => res.json({ ok: true, sign: req.params.sign,
    horoscope: fallbackHoroscope(req.params.sign, date, req.query.lang || 'en', getMoonPhase(date).energy) }), 500);
});
app.post('/api/app/demo-unlock', (req, res) => { premium = true; res.json({ ok: true, premiumExpiry: Date.now() + 7 * 86400000 }); });
app.post('/api/app/iap/sync', (req, res) => res.status(503).json({ ok: false, error: 'iap_not_configured' }));

// MOCK_WWW — віддати іншу копію застосунку (наприклад, стару версію для порівняння «було/стало»)
app.use('/app', express.static(process.env.MOCK_WWW || path.join(__dirname, '../www'), { etag: false, maxAge: 0 }));

// Тестовий профіль одним переходом: /mock/seed?name=Emma&birth=1994-01-05&focus=love,career&streak=3
app.get('/mock/seed', (req, res) => {
  const q = { name: req.query.name || 'Emma', birth: req.query.birth || '1994-01-05', focus: String(req.query.focus || 'love,career,growth').split(','), streak: Number(req.query.streak || 0) };
  res.type('html').send(`<!doctype html><meta charset="utf-8"><body style="background:#0d0a1f"><script>
  (async () => {
    const q = ${JSON.stringify(q)};
    const dev = 'seed-' + Math.random().toString(36).slice(2);
    const h = { 'Content-Type': 'application/json', 'X-Client': 'lunara' };
    const s = await (await fetch('/api/app/session', { method: 'POST', headers: h, body: JSON.stringify({ deviceId: dev }) })).json();
    localStorage.clear();
    localStorage.setItem('lunara_device', dev); localStorage.setItem('lunara_token', s.token); localStorage.setItem('lunara_lang', 'en');
    localStorage.setItem('lunara_focus', JSON.stringify(q.focus));
    if (q.streak) { const d = new Date(); d.setDate(d.getDate() - 1);
      const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      localStorage.setItem('lunara_streak', JSON.stringify({ last: ds, count: q.streak, best: q.streak })); }
    await fetch('/api/users/init', { method: 'POST', headers: { ...h, 'X-App-Auth': s.token }, body: JSON.stringify({ userId: s.userId, firstName: q.name, birthDate: q.birth, lang: 'en' }) });
    location.replace('/app/');
  })();
  </script>`);
});
app.get('/mock/compare', (req, res) => res.sendFile(path.join(__dirname, 'compare.html')));
app.get('/mock/concepts', (req, res) => res.sendFile(path.join(__dirname, 'design-concepts.html')));
app.use('/assets', express.static(path.join(__dirname, '../../frontend/assets')));
app.get('/', (req, res) => res.redirect('/app/'));

app.listen(PORT, () => console.log(`[mock] http://localhost:${PORT}/app/  (PRO: ${premium ? 'on' : 'off'})`));
