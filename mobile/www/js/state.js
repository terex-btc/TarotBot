// ══ Спільний стан застосунку ════════════════════════════════════════════════
import { api } from './api.js';

export const state = {
  userId:    null,
  user:      null,   // { firstName, birthDate, ... } з сервера
  lang:      'en',
  isPremium: false,
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
