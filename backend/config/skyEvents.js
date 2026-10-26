'use strict';
// ══ Космічна погода на сервері: ретроградні планети для гороскопу ═══════════
// Дати пораховані astronomy-engine (точні моменти станцій, UTC) на 2026–2030.
// Ті самі дані — у mobile/www/js/sky.js.

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

const NOTE = {
  en: {
    mercury: 'Mercury is retrograde — re-read messages before you hit send and leave room for delays.',
    venus: 'Venus is retrograde — the past may knock on your heart’s door; don’t rush new commitments.',
    mars: 'Mars is retrograde — rethink your strategy instead of pushing harder.',
  },
  ru: {
    mercury: 'Меркурий ретроградный — перечитывай сообщения перед отправкой и закладывай время на задержки.',
    venus: 'Венера ретроградна — прошлое может постучаться в сердце; не спеши с новыми обязательствами.',
    mars: 'Марс ретроградный — пересмотри стратегию вместо того, чтобы давить сильнее.',
  },
  ua: {
    mercury: 'Меркурій ретроградний — перечитуй повідомлення перед відправкою й закладай час на затримки.',
    venus: 'Венера ретроградна — минуле може постукати в серце; не поспішай з новими зобов’язаннями.',
    mars: 'Марс ретроградний — переглянь стратегію замість того, щоб тиснути сильніше.',
  },
};
const NAME_EN = { mercury: 'Mercury', venus: 'Venus', mars: 'Mars' };
const ORDER = ['mercury', 'venus', 'mars'];
const SIGN_EN = s => s.charAt(0).toUpperCase() + s.slice(1);

// Ретроградні планети на дату ('YYYY-MM-DD' або Date) — беремо полудень UTC
function activeRetros(date = new Date()) {
  const t = (date instanceof Date ? date : new Date(`${date}T12:00:00Z`)).getTime();
  return RETRO.filter(r => t >= Date.parse(r[1]) && t < Date.parse(r[2]))
    .map(([planet, start, end, sign, endSign]) => ({ planet, start, end, sign, endSign }))
    .sort((a, b) => ORDER.indexOf(a.planet) - ORDER.indexOf(b.planet));
}

// Короткий рядок для гороскопу без AI
function skyNote(lang, date) {
  const L = NOTE[lang] || NOTE.en;
  return activeRetros(date).map(r => L[r.planet]).join(' ');
}

// Опис неба для промпта AI (англійською)
function skyPrompt(date) {
  return activeRetros(date).map(r => {
    const end = new Date(r.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
    const where = r.sign === r.endSign ? `in ${SIGN_EN(r.sign)}` : `from ${SIGN_EN(r.sign)} back into ${SIGN_EN(r.endSign)}`;
    return `${NAME_EN[r.planet]} retrograde ${where} (until ${end})`;
  }).join('; ');
}

module.exports = { RETRO, activeRetros, skyNote, skyPrompt };
