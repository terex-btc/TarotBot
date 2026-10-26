// ══ Пуші про події неба й серію (локальні сповіщення в iOS/Android) ═════════
// Ретроград завтра / планета йде прямо / затемнення завтра / повня й молодик,
// і «не загуби серію» на завтрашній вечір. Перепланування — на старті, після
// карти дня й при зміні мови чи перемикача в профілі.
import { t } from './i18n.js';
import { notifications, storage } from './platform.js';
import { currentStreak, localDateStr } from './state.js';
import { upcomingPhases } from './astro.js';
import { skyEventsBetween, sx } from './sky.js';

const KEY = 'lunara_sky_alerts';
const FROM_ID = 2000, TO_ID = 2999, STREAK_ID = 2900;
const DAY = 86400000;

export const skyAlertsOn = () => storage.get(KEY) !== '0';
export function setSkyAlerts(on) { storage.set(KEY, on ? '1' : '0'); }

const at = (date, hour) => { const d = new Date(date); d.setHours(hour, 0, 0, 0); return d; };

// Список сповіщень на найближчі 60 днів (без сьогоднішніх, що вже минули)
export function buildAlerts(now = new Date()) {
  const S = sx();
  const list = [];
  let id = FROM_ID;
  const add = (when, title, body) => { if (when > now) list.push({ id: id++, title, body, at: when }); };

  skyEventsBetween(now, now.getTime() + 60 * DAY).forEach(e => {
    if (e.kind === 'rx') add(at(e.date.getTime() - DAY, 10), t('pushRxTomorrow', { title: S.rx(e.planet) }), S.p[e.planet].tip);
    else if (e.kind === 'direct') add(at(e.date, 10), S.goesDirect(e.planet), t('pushDirectBody'));
    else add(at(e.date.getTime() - DAY, 10), t('pushEclipseTomorrow', { title: S.ecl(e) }), S.eclAbout[e.type]);
  });
  upcomingPhases(now, 8).filter(p => p.phase === 'full' || p.phase === 'new').forEach(p => {
    if (p.date.getTime() - now.getTime() > 60 * DAY) return;
    if (p.phase === 'full') add(at(p.date, 19), t('pushFullTitle'), t('pushFullBody'));
    else add(at(p.date, 9), t('pushNewTitle'), t('pushNewBody'));
  });
  list.sort((a, b) => a.at - b.at);

  // Серія: якщо сьогоднішня карта вже витягнута — нагадати завтра ввечері
  const streak = currentStreak();
  let saved = null;
  try { saved = JSON.parse(storage.get('lunara_daily') || 'null'); } catch (_) {}
  if (streak >= 2 && saved?.date === localDateStr(now)) {
    list.push({ id: STREAK_ID, title: t('pushStreakTitle', { n: streak }), body: t('pushStreakBody'), at: at(now.getTime() + DAY, 20) });
  }
  return list.slice(0, 60);   // iOS тримає не більше 64 запланованих
}

export async function rescheduleAlerts() {
  if (!notifications.supported) return;
  if (!skyAlertsOn() || !(await notifications.granted())) { await notifications.replaceRange(FROM_ID, TO_ID, []); return; }
  await notifications.replaceRange(FROM_ID, TO_ID, buildAlerts());
}
