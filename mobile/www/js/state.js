// ══ Спільний стан застосунку ════════════════════════════════════════════════
import { api } from './api.js';

export const state = {
  userId:    null,
  user:      null,   // { firstName, birthDate, ... } з сервера
  lang:      'en',
  isPremium: false,
  freePro:   false,  // сервер у режимі «PRO для всіх» (LUNARA_FREE_PRO)
  premiumExpiry: null,
  cards:     null,   // повна колода (78) — кеш
  daily:     null,   // сьогоднішня карта дня
  focus:     [],     // теми, які обрав користувач в онбордингу
};

const listeners = new Set();
export function onStateChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function emit(what) { listeners.forEach(fn => { try { fn(what); } catch (_) {} }); }

export function track(event, meta = '') {
  if (!state.userId) return;
  api('POST', '/analytics/event', { userId: state.userId, event, meta: String(meta) }).catch?.(() => {});
}

export async function refreshPremium() {
  const ps = await api('GET', `/users/${state.userId}/premium-status`);
  if (ps.ok) {
    const was = state.isPremium;
    state.isPremium = !!ps.isPremium;
    state.freePro = !!ps.freePro;
    state.premiumExpiry = ps.premiumExpiry || null;
    if (was !== state.isPremium) emit('premium');
  }
  return state.isPremium;
}

export async function loadCards() {
  if (state.cards) return state.cards;
  const res = await api('GET', '/cards');
  if (res.ok) state.cards = res.cards;
  return state.cards || [];
}

export function cardSuit(card) {
  const m = /\/(card|wands|cups|swords|pents|pentacles)_/.exec(card?.image || '');
  if (!m || m[1] === 'card') return 'major';
  return m[1] === 'pents' ? 'pentacles' : m[1];
}

// ── Місцева дата і серія днів (карта дня підряд) ─────────────────────────────
export function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const STREAK_KEY = 'lunara_streak';
const yesterdayOf = s => { const d = new Date(`${s}T12:00:00`); d.setDate(d.getDate() - 1); return localDateStr(d); };
function readStreak() {
  try { return JSON.parse(localStorage.getItem(STREAK_KEY) || 'null') || { last: '', count: 0, best: 0 }; }
  catch (_) { return { last: '', count: 0, best: 0 }; }
}
// Викликається, коли користувач відкрив карту дня
export function bumpStreak() {
  const today = localDateStr();
  const s = readStreak();
  if (s.last === today) return s;
  const count = s.last === yesterdayOf(today) ? s.count + 1 : 1;
  const next = { last: today, count, best: Math.max(s.best || 0, count) };
  try { localStorage.setItem(STREAK_KEY, JSON.stringify(next)); } catch (_) {}
  return next;
}
// Поточна серія: жива, якщо остання карта — сьогодні або вчора
export function currentStreak() {
  const s = readStreak();
  const today = localDateStr();
  return s.last === today || s.last === yesterdayOf(today) ? s.count : 0;
}
// Мілісекунди до місцевої півночі — коли буде нова карта дня
export function msToMidnight() {
  const n = new Date(); const m = new Date(n); m.setHours(24, 0, 0, 0);
  return m - n;
}
