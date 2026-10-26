// ══ Моменти після розкладу: м’який пейвол і прохання про оцінку ═════════════
// Пейвол — один раз, коли людина закрила свій перший розклад (уже побачила цінність).
// Оцінка — після третього розкладу, у природній паузі; системне вікно App Store.
import { state, track } from './state.js';
import { storage, requestReview } from './platform.js';
import { showPaywall } from './screens/paywall.js';

const DONE_KEY = 'lunara_readings_done';

// Розклад або карта дня щойно відкриті
export function readingDone() {
  const n = Number(storage.get(DONE_KEY) || 0) + 1;
  storage.set(DONE_KEY, String(n));
  return n;
}

// Людина закрила розклад — слушний момент
export function afterReadingClosed() {
  const n = Number(storage.get(DONE_KEY) || 0);
  if (!n) return;
  if (!state.isPremium && !storage.get('lunara_pw_wow')) {
    storage.set('lunara_pw_wow', '1');
    setTimeout(() => showPaywall({ source: 'after_first_reading' }), 450);
    return;
  }
  if (n >= 3 && !storage.get('lunara_review_asked')) {
    storage.set('lunara_review_asked', '1');
    track('review_ask', String(n));
    setTimeout(requestReview, 600);
  }
}
