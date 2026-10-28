// ══ Космічна погода: ретроградні планети й затемнення ═══════════════════════
// Дати пораховані astronomy-engine (точні моменти станцій і піки затемнень, UTC) на 2026–2030.
// Ті самі ретрогради — у backend/config/skyEvents.js (для гороскопу).
import { getLang, locale } from './i18n.js';

// [планета, початок ретрограду (UTC), кінець (UTC), знак на початку, знак наприкінці]
const RETRO = [
  ['mercury', '2026-02-26T06:47Z', '2026-03-20T19:34Z', 'pisces', 'pisces'],
  ['mercury', '2026-06-29T17:37Z', '2026-07-23T22:57Z', 'cancer', 'cancer'],
  ['venus', '2026-10-03T07:10Z', '2026-11-14T00:21Z', 'scorpio', 'libra'],
  ['mercury', '2026-10-24T07:15Z', '2026-11-13T15:52Z', 'scorpio', 'scorpio'],
  ['mars', '2027-01-10T13:01Z', '2027-04-01T14:10Z', 'virgo', 'leo'],
  ['mercury', '2027-02-09T17:36Z', '2027-03-03T12:35Z', 'pisces', 'aquarius'],
  ['mercury', '2027-06-10T18:19Z', '2027-07-04T19:40Z', 'cancer', 'gemini'],
  ['mercury', '2027-10-07T14:40Z', '2027-10-28T14:11Z', 'scorpio', 'libra'],
  ['mercury', '2028-01-24T11:04Z', '2028-02-14T12:39Z', 'aquarius', 'aquarius'],
  ['venus', '2028-05-10T23:02Z', '2028-06-22T22:13Z', 'gemini', 'gemini'],
  ['mercury', '2028-05-21T08:39Z', '2028-06-14T06:07Z', 'gemini', 'gemini'],
  ['mercury', '2028-09-19T16:31Z', '2028-10-11T10:30Z', 'libra', 'libra'],
  ['mercury', '2029-01-07T07:58Z', '2029-01-27T18:37Z', 'aquarius', 'capricorn'],
  ['mars', '2029-02-14T08:14Z', '2029-05-05T18:57Z', 'libra', 'virgo'],
  ['mercury', '2029-05-01T23:10Z', '2029-05-25T19:16Z', 'taurus', 'taurus'],
  ['mercury', '2029-09-02T12:15Z', '2029-09-25T02:03Z', 'libra', 'virgo'],
  ['venus', '2029-12-16T23:49Z', '2030-01-26T21:33Z', 'capricorn', 'capricorn'],
  ['mercury', '2029-12-22T05:51Z', '2030-01-11T05:43Z', 'capricorn', 'capricorn'],
  ['mercury', '2030-04-13T02:27Z', '2030-05-06T20:18Z', 'taurus', 'aries'],
  ['mercury', '2030-08-16T01:23Z', '2030-09-08T09:23Z', 'virgo', 'virgo'],
  ['mercury', '2030-12-06T02:45Z', '2030-12-25T21:16Z', 'capricorn', 'sagittarius'],
];
// [тип, вид, пік (UTC), знак]
const ECL = [
  ['solar', 'annular', '2026-02-17T12:11Z', 'aquarius'],
  ['lunar', 'total', '2026-03-03T11:33Z', 'virgo'],
  ['solar', 'total', '2026-08-12T17:45Z', 'leo'],
  ['lunar', 'partial', '2026-08-28T04:12Z', 'pisces'],
  ['solar', 'annular', '2027-02-06T15:59Z', 'aquarius'],
  ['lunar', 'penumbral', '2027-02-20T23:12Z', 'virgo'],
  ['lunar', 'penumbral', '2027-07-18T16:02Z', 'capricorn'],
  ['solar', 'total', '2027-08-02T10:06Z', 'leo'],
  ['lunar', 'penumbral', '2027-08-17T07:13Z', 'aquarius'],
  ['lunar', 'partial', '2028-01-12T04:13Z', 'cancer'],
  ['solar', 'annular', '2028-01-26T15:07Z', 'aquarius'],
  ['lunar', 'partial', '2028-07-06T18:19Z', 'capricorn'],
  ['solar', 'total', '2028-07-22T02:55Z', 'cancer'],
  ['lunar', 'total', '2028-12-31T16:51Z', 'cancer'],
  ['solar', 'partial', '2029-01-14T17:12Z', 'capricorn'],
  ['solar', 'partial', '2029-06-12T04:04Z', 'gemini'],
  ['lunar', 'total', '2029-06-26T03:22Z', 'capricorn'],
  ['solar', 'partial', '2029-07-11T15:36Z', 'cancer'],
  ['solar', 'partial', '2029-12-05T15:02Z', 'sagittarius'],
  ['lunar', 'total', '2029-12-20T22:41Z', 'gemini'],
  ['solar', 'annular', '2030-06-01T06:27Z', 'gemini'],
  ['lunar', 'partial', '2030-06-15T18:33Z', 'sagittarius'],
  ['solar', 'total', '2030-11-25T06:50Z', 'sagittarius'],
  ['lunar', 'penumbral', '2030-12-09T22:27Z', 'gemini'],
];

export const GLYPH = { mercury: '☿︎', venus: '♀︎', mars: '♂︎' };
const ORDER = ['mercury', 'venus', 'mars'];
const DAY = 86400000;
const t0 = d => (d instanceof Date ? d : new Date(d || Date.now())).getTime();

const retroObj = ([planet, start, end, sign, endSign]) => ({ planet, start: new Date(start), end: new Date(end), sign, endSign });
const eclObj = ([type, kind, date, sign]) => ({ type, kind, date: new Date(date), sign });

// Ретроградні планети на момент date — з днями до кінця й прогресом
export function activeRetros(date = new Date()) {
  const t = t0(date);
  return RETRO.filter(r => t >= Date.parse(r[1]) && t < Date.parse(r[2])).map(retroObj)
    .sort((a, b) => ORDER.indexOf(a.planet) - ORDER.indexOf(b.planet))
    .map(r => ({ ...r, daysLeft: Math.max(1, Math.ceil((r.end - t) / DAY)), progress: (t - r.start) / (r.end - r.start) }));
}

// Затемнення в межах ±days від дати
export function eclipseNear(date = new Date(), days = 3) {
  const t = t0(date);
  const e = ECL.find(x => Math.abs(Date.parse(x[2]) - t) <= days * DAY);
  return e ? eclObj(e) : null;
}

// Усі події між датами: початок ретрограду, «планета йде прямо», затемнення
export function skyEventsBetween(from, to) {
  const a = t0(from), b = t0(to), out = [];
  RETRO.forEach(r => {
    const o = retroObj(r);
    if (o.start >= a && o.start < b) out.push({ kind: 'rx', planet: o.planet, date: o.start, sign: o.sign });
    if (o.end >= a && o.end < b) out.push({ kind: 'direct', planet: o.planet, date: o.end, sign: o.endSign });
  });
  ECL.forEach(e => { const o = eclObj(e); if (o.date >= a && o.date < b) out.push({ ...o, eclKind: o.kind, kind: 'eclipse' }); });
  return out.sort((x, y) => x.date - y.date);
}

// Найближчі події (для «Скоро»)
export function upcomingSky(date = new Date(), count = 5) {
  return skyEventsBetween(date, t0(date) + 400 * DAY).slice(0, count);
}

// ── Тексти ───────────────────────────────────────────────────────────────────
const plural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? few : many;
};

const TX = {
  en: {
    title: 'Cosmic weather', now: 'Right now', comingUp: 'Coming up', calm: 'No planets are retrograde right now — a good time to move forward with your plans.',
    name: { mercury: 'Mercury', venus: 'Venus', mars: 'Mars' },
    rx: p => `${TX.en.name[p]} retrograde`,
    rxBoth: ps => `${ps.map(p => TX.en.name[p]).join(' & ')} retrograde`,
    goesRx: p => `${TX.en.name[p]} turns retrograde`, goesDirect: p => `${TX.en.name[p]} goes direct`,
    inSign: s => `in ${s}`, left: n => (n === 1 ? '1 day left' : `${n} days left`), leftShort: n => `${n}d`,
    inDays: n => (n <= 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`),
    ecl: e => `${{ total: 'Total', annular: 'Annular', partial: 'Partial', penumbral: 'Penumbral' }[e.eclKind || e.kind]} ${e.type} eclipse`,
    do: 'Good for', avoid: 'Better to avoid', love: 'Love', moonToday: 'Moon today', openSky: 'Cosmic weather',
    p: {
      mercury: {
        rules: 'Mercury rules communication, technology, travel and contracts.',
        about: 'When it’s retrograde, messages get crossed, tech glitches and plans shift. Don’t panic — slow down, review and revisit. The “re-” words work best: reflect, reconnect, revise.',
        do: ['Double-check messages before you send them', 'Back up your phone and files', 'Revisit old projects and ideas', 'Leave extra time for travel'],
        avoid: ['Signing important contracts in a hurry', 'Buying new tech on impulse', 'Arguing over text — talk in person'],
        love: 'Old flames and exes may reach out. Talk things through calmly — misunderstandings are likely.',
        reading: 'Mercury is retrograde: if this reading touches on conversations, plans or decisions, take your time and double-check the details.',
        tip: 'Re-read messages before you hit send.',
      },
      venus: {
        rules: 'Venus rules love, beauty, pleasure and money.',
        about: 'When it’s retrograde, the heart looks back. Past relationships resurface, feelings get re-examined, and you see what you truly value. It’s a time to heal and reassess — not to rush into something new.',
        do: ['Reflect on what you really want in love', 'Slow down and enjoy simple pleasures', 'Heal old wounds and forgive'],
        avoid: ['Rushing into a new relationship', 'Drastic makeovers or new tattoos', 'Big luxury purchases'],
        love: 'Exes return and old feelings stir. Ask yourself whether it’s growth or just nostalgia.',
        reading: 'Venus is retrograde: feelings and past relationships are being re-examined — don’t rush big decisions in love or money.',
        tip: 'Love looks back — don’t rush new commitments.',
      },
      mars: {
        rules: 'Mars rules energy, drive, courage and conflict.',
        about: 'When it’s retrograde, energy turns inward. Progress slows, frustration builds and old conflicts may flare up. Use this time to rethink your strategy instead of pushing harder.',
        do: ['Rework your plans and strategy', 'Channel frustration into exercise', 'Finish what you already started'],
        avoid: ['Picking fights or giving ultimatums', 'Launching big new projects', 'Risky moves out of impatience'],
        love: 'Passion simmers and tempers flare. Choose patience over pressure.',
        reading: 'Mars is retrograde: if things feel stuck, rethink your approach instead of forcing progress.',
        tip: 'Rethink, don’t force.',
      },
    },
    eclAbout: { solar: 'A solar eclipse is a supercharged New Moon: it opens sudden new chapters. Set intentions, but don’t force outcomes — what begins now unfolds over the next six months.',
                lunar: 'A lunar eclipse is an intense Full Moon: it brings endings, revelations and emotional release. Let go of what has run its course.' },
    eclReading: 'An eclipse is near: events can move faster than usual, and turning points are likely.',
  },
};
export const sx = () => TX[getLang()] || TX.en;

// Рядки для «Загальної картини» розкладу, зробленого в момент date
export function readingSkyLines(date = new Date(), { love = false } = {}) {
  const T = sx();
  const rx = activeRetros(date);
  const lines = rx.map(r => (love && r.planet === 'venus' ? `${T.p.venus.reading} ${T.p.venus.love}` : T.p[r.planet].reading));
  if (eclipseNear(date, 7)) lines.push(T.eclReading);
  return lines;
}

// Діапазон дат у мові користувача: «24 жовт. – 13 лист.»
export function fmtRange(a, b) {
  const o = { month: 'short', day: 'numeric' };
  return `${a.toLocaleDateString(locale(), o)} – ${b.toLocaleDateString(locale(), o)}`;
}
