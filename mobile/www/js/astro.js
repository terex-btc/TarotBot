// ══ Астрологія та нумерологія — рахується на пристрої ═══════════════════════
// Знак, фаза й знак Місяця, число життєвого шляху, особистий рік/день, сумісність.

export const SIGNS = [
  { key: 'capricorn',   start: [12, 22], end: [1, 19],  element: 'earth', modality: 'cardinal', ruler: 'saturn',
    name: { en: 'Capricorn', ru: 'Козерог', ua: 'Козеріг' } },
  { key: 'aquarius',    start: [1, 20],  end: [2, 18],  element: 'air',   modality: 'fixed',    ruler: 'uranus',
    name: { en: 'Aquarius', ru: 'Водолей', ua: 'Водолій' } },
  { key: 'pisces',      start: [2, 19],  end: [3, 20],  element: 'water', modality: 'mutable',  ruler: 'neptune',
    name: { en: 'Pisces', ru: 'Рыбы', ua: 'Риби' } },
  { key: 'aries',       start: [3, 21],  end: [4, 19],  element: 'fire',  modality: 'cardinal', ruler: 'mars',
    name: { en: 'Aries', ru: 'Овен', ua: 'Овен' } },
  { key: 'taurus',      start: [4, 20],  end: [5, 20],  element: 'earth', modality: 'fixed',    ruler: 'venus',
    name: { en: 'Taurus', ru: 'Телец', ua: 'Телець' } },
  { key: 'gemini',      start: [5, 21],  end: [6, 20],  element: 'air',   modality: 'mutable',  ruler: 'mercury',
    name: { en: 'Gemini', ru: 'Близнецы', ua: 'Близнюки' } },
  { key: 'cancer',      start: [6, 21],  end: [7, 22],  element: 'water', modality: 'cardinal', ruler: 'moon',
    name: { en: 'Cancer', ru: 'Рак', ua: 'Рак' } },
  { key: 'leo',         start: [7, 23],  end: [8, 22],  element: 'fire',  modality: 'fixed',    ruler: 'sun',
    name: { en: 'Leo', ru: 'Лев', ua: 'Лев' } },
  { key: 'virgo',       start: [8, 23],  end: [9, 22],  element: 'earth', modality: 'mutable',  ruler: 'mercury',
    name: { en: 'Virgo', ru: 'Дева', ua: 'Діва' } },
  { key: 'libra',       start: [9, 23],  end: [10, 22], element: 'air',   modality: 'cardinal', ruler: 'venus',
    name: { en: 'Libra', ru: 'Весы', ua: 'Терези' } },
  { key: 'scorpio',     start: [10, 23], end: [11, 21], element: 'water', modality: 'fixed',    ruler: 'pluto',
    name: { en: 'Scorpio', ru: 'Скорпион', ua: 'Скорпіон' } },
  { key: 'sagittarius', start: [11, 22], end: [12, 21], element: 'fire',  modality: 'mutable',  ruler: 'jupiter',
    name: { en: 'Sagittarius', ru: 'Стрелец', ua: 'Стрілець' } },
];

// Порядок знаків від Овна — для знаку Місяця (0° = Овен)
const ZODIAC_ORDER = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];

export const signByKey = key => SIGNS.find(s => s.key === key);

function parseDate(str) {
  const [y, m, d] = String(str).split('-').map(Number);
  return { y, m, d };
}

export function zodiacOf(birthDate) {
  const { m, d } = parseDate(birthDate);
  for (const s of SIGNS) {
    const [sm, sd] = s.start, [em, ed] = s.end;
    if ((m === sm && d >= sd) || (m === em && d <= ed)) return s;
  }
  return SIGNS[0];
}

// ── Нумерологія ──────────────────────────────────────────────────────────────
function reduce(n, keepMaster = true) {
  while (n > 9 && !(keepMaster && (n === 11 || n === 22 || n === 33))) {
    n = String(n).split('').reduce((a, b) => a + Number(b), 0);
  }
  return n;
}
const digitSum = s => String(s).replace(/\D/g, '').split('').reduce((a, b) => a + Number(b), 0);

export const lifePath = birthDate => reduce(digitSum(birthDate));

export function personalYear(birthDate, year = new Date().getFullYear()) {
  const { m, d } = parseDate(birthDate);
  return reduce(digitSum(`${m}${d}${year}`), false);
}

export function personalDay(birthDate, date = new Date()) {
  const py = personalYear(birthDate, date.getFullYear());
  return reduce(py + digitSum(date.getMonth() + 1) + digitSum(date.getDate()), false);
}

// ── Місяць ───────────────────────────────────────────────────────────────────
// Спрощені формули Міуса (точність ~1° — вистачає для фази та знаку)
const rad = d => d * Math.PI / 180;
const norm = d => ((d % 360) + 360) % 360;

function julianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

export function moonAt(date = new Date()) {
  const d = julianDay(date) - 2451545.0;
  const Ls = norm(280.460 + 0.9856474 * d);
  const Ms = norm(357.529 + 0.98560028 * d);
  const sunLon = norm(Ls + 1.915 * Math.sin(rad(Ms)) + 0.020 * Math.sin(rad(2 * Ms)));

  const L  = norm(218.316 + 13.176396 * d);
  const M  = norm(134.963 + 13.064993 * d);
  const D  = norm(297.850 + 12.190749 * d);
  const moonLon = norm(L
    + 6.289 * Math.sin(rad(M))
    + 1.274 * Math.sin(rad(2 * D - M))
    + 0.658 * Math.sin(rad(2 * D))
    + 0.214 * Math.sin(rad(2 * M))
    - 0.186 * Math.sin(rad(Ms))
    - 0.114 * Math.sin(rad(2 * norm(93.272 + 13.229350 * d))));

  const elong = norm(moonLon - sunLon);              // 0 = новий, 180 = повний
  const illum = (1 - Math.cos(rad(elong))) / 2;       // 0..1
  const waxing = elong < 180;
  const age = elong / 360 * 29.530588;
  return {
    illum, waxing, age, elong,
    phase: phaseKey(elong),
    sign: ZODIAC_ORDER[Math.floor(moonLon / 30)],
  };
}

function phaseKey(e) {
  if (e < 12 || e >= 348) return 'new';
  if (e < 80)  return 'waxingCrescent';
  if (e < 100) return 'firstQuarter';
  if (e < 168) return 'waxingGibbous';
  if (e < 192) return 'full';
  if (e < 260) return 'waningGibbous';
  if (e < 280) return 'lastQuarter';
  return 'waningCrescent';
}

// Найближчі ключові фази (новий, I чверть, повня, III чверть) — для календаря
export function upcomingPhases(from = new Date(), count = 4) {
  const targets = [[0, 'new'], [90, 'firstQuarter'], [180, 'full'], [270, 'lastQuarter']];
  const out = [];
  let t = new Date(from);
  t.setHours(12, 0, 0, 0);
  let prev = moonAt(t).elong;
  for (let i = 1; i <= 60 && out.length < count; i++) {
    const next = new Date(t.getTime() + i * 86400000);
    const e = moonAt(next).elong;
    for (const [deg, key] of targets) {
      const crossed = deg === 0 ? prev > e : prev < deg && e >= deg;
      if (crossed) out.push({ date: next, ...moonAt(next), phase: key });
    }
    prev = e;
  }
  return out;
}

// ── Сумісність знаків + чисел ────────────────────────────────────────────────
const ELEMENT_SCORE = {
  'fire-fire': 82, 'fire-air': 90, 'fire-earth': 58, 'fire-water': 52,
  'air-air': 80, 'air-earth': 55, 'air-water': 60,
  'earth-earth': 84, 'earth-water': 91,
  'water-water': 86,
};

export function compatibility(birthA, birthB) {
  const a = zodiacOf(birthA), b = zodiacOf(birthB);
  const key = [a.element, b.element].sort().join('-');
  const pair = ELEMENT_SCORE[key] ?? ELEMENT_SCORE[[b.element, a.element].join('-')] ?? 65;
  const la = lifePath(birthA), lb = lifePath(birthB);
  const lpDiff = Math.abs(reduce(la, false) - reduce(lb, false));
  const numBonus = lpDiff === 0 ? 6 : lpDiff <= 2 ? 3 : lpDiff >= 6 ? -4 : 0;
  const modBonus = a.modality === b.modality ? -3 : 2;
  const total = Math.max(38, Math.min(98, pair + numBonus + modBonus));
  return {
    total, a, b, lifeA: la, lifeB: lb,
    love: clamp(total + (a.element === b.element ? 4 : -2)),
    talk: clamp(total + (a.element === 'air' || b.element === 'air' ? 5 : -3)),
    trust: clamp(total + (a.element === 'earth' || b.element === 'earth' ? 5 : -2)),
  };
}
const clamp = n => Math.max(30, Math.min(99, Math.round(n)));
