// ══ Ілюстрації (SVG, без зовнішніх картинок) ════════════════════════════════
let _uid = 0;
const uid = p => `${p}${++_uid}`;

// ── Сорочки карт (5 дизайнів, PRO-прикраса) ─────────────────────────────────
// Обрана сорочка зберігається на пристрої; cardBack() без style малює поточну.
export const CARD_BACKS = {
  violet:   { g: ['#5b3df0', '#3d24b8', '#25156f'], line: '#d8ccff', accent: '#f2c75c', glow: '#ffe9a8', moon: '#efe5ff' },
  sun:      { g: ['#e3a531', '#a8641a', '#4f2a08'], line: '#ffe6ad', accent: '#fff3c4', glow: '#fff1b8', moon: '#fff3d6' },
  emerald:  { g: ['#1fae86', '#13755f', '#0a3a33'], line: '#c4f7e6', accent: '#e8fff6', glow: '#b8ffe6', moon: '#eafff7' },
  rose:     { g: ['#ef6fa0', '#b93a72', '#561437'], line: '#ffd6e6', accent: '#ffe9f1', glow: '#ffc4dc', moon: '#fff0f6' },
  midnight: { g: ['#2c3f96', '#18235e', '#070b24'], line: '#b4c8ff', accent: '#dfe8ff', glow: '#9fb8ff', moon: '#e6edff' },
};
export const currentBack = () => {
  try { const v = localStorage.getItem('lunara_back'); return CARD_BACKS[v] ? v : 'violet'; } catch (_) { return 'violet'; }
};

function backEmblem(style, c) {
  if (style === 'sun') return `<circle cx="60" cy="88" r="15" fill="${c.accent}"/>
    ${Array.from({ length: 12 }, (_, i) => `<path d="M60 63 L62.5 70 L57.5 70Z" fill="${c.accent}" transform="rotate(${i * 30} 60 88)"/>`).join('')}
    <circle cx="60" cy="88" r="21" fill="none" stroke="${c.accent}" stroke-opacity=".5"/>`;
  if (style === 'emerald') return `<path d="M50 66 a24 24 0 1 0 26 38 a19 19 0 1 1 -26 -38Z" fill="${c.accent}"/>
    <circle cx="74" cy="76" r="2" fill="${c.accent}"/><circle cx="80" cy="92" r="1.5" fill="${c.accent}"/>`;
  if (style === 'rose') return `<path d="M60 108 C40 94 34 84 34 76 a12 12 0 0 1 26 -4 a12 12 0 0 1 26 4 c0 8 -6 18 -26 32Z" fill="${c.accent}"/>
    <path d="M60 102 C47 92 42 85 42 79 a8 8 0 0 1 18 -3" fill="none" stroke="${c.g[1]}" stroke-width="1.4" opacity=".5"/>`;
  if (style === 'midnight') return `<path d="M34 88 C46 70 74 70 86 88 C74 106 46 106 34 88Z" fill="${c.accent}"/>
    <circle cx="60" cy="88" r="10" fill="${c.g[2]}"/><circle cx="63" cy="85" r="3" fill="${c.accent}"/>
    <path d="M60 62 v-6 M44 67 l-4 -4 M76 67 l4 -4" stroke="${c.accent}" stroke-width="1.6" stroke-linecap="round"/>`;
  // violet — восьмипроменева зірка
  return `<path d="M60 64 L64.5 83.5 L84 88 L64.5 92.5 L60 112 L55.5 92.5 L36 88 L55.5 83.5Z" fill="#fff4cf"/>
    <path d="M60 74 L62.4 85.6 L74 88 L62.4 90.4 L60 102 L57.6 90.4 L46 88 L57.6 85.6Z" fill="${c.accent}" transform="rotate(45 60 88)"/>`;
}

export function cardBack({ glow = true, style } = {}) {
  const st = style || currentBack();
  const c = CARD_BACKS[st] || CARD_BACKS.violet;
  const g = uid('cb'), s = uid('cs');
  return `<svg class="card-back-svg" viewBox="0 0 120 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c.g[0]}"/><stop offset=".55" stop-color="${c.g[1]}"/><stop offset="1" stop-color="${c.g[2]}"/>
      </linearGradient>
      <radialGradient id="${s}" cx=".5" cy=".46" r=".5">
        <stop offset="0" stop-color="${c.glow}" stop-opacity=".55"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="120" height="190" rx="12" fill="url(#${g})"/>
    <rect x="7" y="7" width="106" height="176" rx="8" fill="none" stroke="${c.line}" stroke-opacity=".45" stroke-width="1"/>
    <rect x="11" y="11" width="98" height="168" rx="6" fill="none" stroke="${c.line}" stroke-opacity=".18" stroke-width=".8" stroke-dasharray="2 3"/>
    ${glow ? `<circle cx="60" cy="88" r="44" fill="url(#${s})"/>` : ''}
    <circle cx="60" cy="88" r="27" fill="none" stroke="${c.accent}" stroke-opacity=".9" stroke-width="1.4"/>
    <circle cx="60" cy="88" r="33" fill="none" stroke="${c.accent}" stroke-opacity=".35" stroke-width=".8"/>
    ${backEmblem(st, c)}
    <path d="M52 30 a9 9 0 1 0 16 0 a7.2 7.2 0 1 1 -16 0Z" fill="${c.moon}"/>
    <path d="M52 160 a9 9 0 1 1 16 0 a7.2 7.2 0 1 0 -16 0Z" fill="${c.moon}" opacity=".8"/>
    <circle cx="24" cy="40" r="1.4" fill="#fff"/><circle cx="98" cy="52" r="1.1" fill="#fff"/>
    <circle cx="30" cy="140" r="1.1" fill="#fff"/><circle cx="92" cy="150" r="1.5" fill="#fff"/>
  </svg>`;
}

// Сузір'я — тло плитки гороскопу
export function constellation() {
  const pts = [[18, 30], [38, 18], [58, 34], [80, 22], [92, 48], [70, 62], [46, 56], [26, 70]];
  return `<svg class="constellation" viewBox="0 0 110 90" aria-hidden="true">
    <path d="M${pts.map(p => p.join(' ')).join(' L')}" fill="none" stroke="currentColor" stroke-width=".6" stroke-opacity=".35"/>
    ${pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 === 0 ? 1.8 : 1.2}" fill="currentColor"/>`).join('')}
  </svg>`;
}

// ── Реалістичний Місяць із кратерами та фазою ───────────────────────────────
// illum 0..1, waxing: світла частина справа (північна півкуля)
export function moonSvg(illum, waxing, { size = 120 } = {}) {
  const r = 48, cx = 50, cy = 50;
  const tex = uid('mt'), clip = uid('mc'), shade = uid('ms');
  const k = Math.max(0, Math.min(1, illum));
  const rx = Math.abs(2 * k - 1) * r;
  const crescent = k < 0.5;
  // світла півкуля + еліпс термінатора
  const litSweep = waxing ? 1 : 0;
  const termSweep = waxing ? (crescent ? 0 : 1) : (crescent ? 1 : 0);
  const lit = k > 0.985
    ? `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0Z`
    : `M${cx} ${cy - r} A${r} ${r} 0 0 ${litSweep} ${cx} ${cy + r} A${rx} ${r} 0 0 ${termSweep} ${cx} ${cy - r}Z`;
  const craters = [[34, 30, 7], [62, 26, 5], [70, 52, 9], [40, 62, 6], [56, 74, 7], [26, 50, 4], [78, 34, 3.5], [48, 44, 3]]
    .map(([x, y, cr]) => `<circle cx="${x}" cy="${y}" r="${cr}" fill="#000" opacity=".09"/><circle cx="${x - cr * .18}" cy="${y - cr * .18}" r="${cr * .78}" fill="#fff" opacity=".06"/>`).join('');
  return `<svg class="moon-svg" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
    <defs>
      <radialGradient id="${tex}" cx=".38" cy=".34" r=".75">
        <stop offset="0" stop-color="#fbf3df"/><stop offset=".6" stop-color="#d9ccb0"/><stop offset="1" stop-color="#a99a7c"/>
      </radialGradient>
      <radialGradient id="${shade}" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="#2a2540"/><stop offset="1" stop-color="#15121f"/>
      </radialGradient>
      <clipPath id="${clip}"><path d="${k < 0.015 ? 'M0 0' : lit}"/></clipPath>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${shade})"/>
    <g clip-path="url(#${clip})">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${tex})"/>${craters}
    </g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#fff" stroke-opacity=".08"/>
  </svg>`;
}

// ── Знаки зодіаку — лінійні гліфи ────────────────────────────────────────────
const GLYPHS = {
  aries: 'M50 86V46M50 46C50 22 24 14 18 32c-4 14 10 20 16 12M50 46C50 22 76 14 82 32c4 14-10 20-16 12',
  taurus: 'M30 64a20 20 0 1 0 40 0a20 20 0 1 0-40 0M16 18c8 20 20 26 34 26s26-6 34-26',
  gemini: 'M20 18c20 9 40 9 60 0M20 82c20-9 40-9 60 0M38 24v52M62 24v52',
  cancer: 'M84 34C72 18 44 16 28 30M24 40a10 10 0 1 0 0.1 0M16 66c12 16 40 18 56 4M76 60a10 10 0 1 0 0.1 0',
  leo: 'M30 74a12 12 0 1 1 0.1 0M42 62C40 32 50 18 64 18c16 0 20 16 12 30-8 14-10 26-2 34 4 4 12 2 14-4',
  virgo: 'M14 26v50M14 36c0-14 18-14 18 0v40M32 36c0-14 18-14 18 0v34c0 16 22 18 28-2 3-12-10-16-16-4-6 14 4 24 20 24',
  libra: 'M14 80h72M14 64h20c-10-10-8-34 16-34s26 24 16 34h20',
  scorpio: 'M12 26v48M12 36c0-14 18-14 18 0v38M30 36c0-14 18-14 18 0v34c0 10 10 14 20 8l12-8M70 64l10 6-4 11',
  sagittarius: 'M18 82L82 18M54 18h28v28M30 50l20 20',
  capricorn: 'M14 24c8 0 12 6 14 16l8 36 12-42c4-12 18-12 20 2 2 16-8 30-6 38 2 12 20 14 22 0 2-12-12-16-18-6',
  aquarius: 'M10 42l14-12 14 12 14-12 14 12 14-12M10 68l14-12 14 12 14-12 14 12 14-12',
  pisces: 'M22 16c22 18 22 50 0 68M78 16c-22 18-22 50 0 68M24 50h52',
};

export function zodiacGlyph(key, { stroke = 6 } = {}) {
  return `<svg class="zglyph" viewBox="0 0 100 100" aria-hidden="true"><path d="${GLYPHS[key] || GLYPHS.aries}"
    fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// ── Око (Оракул) ─────────────────────────────────────────────────────────────
export function eyeArt() {
  const iris = uid('ei');
  return `<svg class="eye-art" viewBox="0 0 160 100" aria-hidden="true">
    <defs><radialGradient id="${iris}" cx=".4" cy=".35" r=".7">
      <stop offset="0" stop-color="#4b2fd1"/><stop offset="1" stop-color="#160c4a"/></radialGradient></defs>
    <path d="M8 50C34 14 126 14 152 50C126 86 34 86 8 50Z" fill="#ece5ff"/>
    <circle cx="80" cy="50" r="27" fill="url(#${iris})"/>
    <circle cx="80" cy="50" r="11" fill="#0b0626"/>
    <circle cx="90" cy="40" r="6" fill="#fff"/><circle cx="72" cy="58" r="2.4" fill="#fff" opacity=".7"/>
  </svg>`;
}

// ── Іскри / зірочки ──────────────────────────────────────────────────────────
export const sparkle = (cls = '') => `<svg class="sparkle ${cls}" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 0C12.8 7 17 11.2 24 12C17 12.8 12.8 17 12 24C11.2 17 7 12.8 0 12C7 11.2 11.2 7 12 0Z" fill="currentColor"/></svg>`;

// ── Пейзажі ──────────────────────────────────────────────────────────────────
export function hills({ a = '#3a2a8f', b = '#241a66' } = {}) {
  return `<svg class="hills" viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 70C60 40 110 44 170 66s120 30 230-8V140H0Z" fill="${a}"/>
    <path d="M0 96C80 72 150 78 220 98s120 18 180-6V140H0Z" fill="${b}"/>
  </svg>`;
}

export function mountains() {
  return `<svg class="mountains" viewBox="0 0 400 160" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 110L60 62 110 96 170 40 236 100 290 58 350 92 400 70V160H0Z" fill="#3b2c8c" opacity=".75"/>
    <path d="M0 130L70 92 130 118 200 76 270 120 330 90 400 112V160H0Z" fill="#251a62"/>
  </svg>`;
}

export function pines() {
  const tree = (x, h, o) => {
    const b = 160, w = h * .36;
    const pts = [[x, b - h], [x + w * .45, b - h * .62], [x + w * .22, b - h * .62], [x + w * .75, b - h * .3],
      [x + w * .48, b - h * .3], [x + w, b], [x - w, b], [x - w * .48, b - h * .3], [x - w * .75, b - h * .3],
      [x - w * .22, b - h * .62], [x - w * .45, b - h * .62]];
    return `<polygon points="${pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')}" fill="#1c1450" opacity="${o}"/>`;
  };
  return `<svg class="pines" viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    ${[[30, 150, .55], [90, 120, .5], [320, 140, .55], [372, 118, .5], [200, 96, .35]].map(t => tree(...t)).join('')}
    ${[[10, 110, .95], [60, 136, .95], [140, 84, .9], [270, 92, .9], [346, 128, .95], [396, 100, .95]].map(t => tree(...t)).join('')}
  </svg>`;
}

export function clouds(cls = '') {
  return `<div class="clouds ${cls}" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>`;
}

export function starsField(n = 40, seed = 7) {
  let s = seed;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  return `<div class="stars-field" aria-hidden="true">${Array.from({ length: n }, () =>
    `<i style="left:${(rnd() * 100).toFixed(1)}%;top:${(rnd() * 100).toFixed(1)}%;--d:${(rnd() * 4).toFixed(2)}s;--s:${(rnd() * 1.6 + .6).toFixed(1)}px"></i>`).join('')}</div>`;
}

// ── Іконки (таббар, кнопки) ──────────────────────────────────────────────────
const I = (d, extra = '') => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" ${extra}>${d}</svg>`;
export const icons = {
  today: I('<circle cx="12" cy="12" r="4.2" fill="currentColor"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
  spreads: I('<rect x="3.5" y="5" width="9" height="14" rx="2" transform="rotate(-10 8 12)" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="10.5" y="4" width="9" height="14" rx="2" transform="rotate(8 15 11)" fill="currentColor" opacity=".9"/>'),
  oracle: I('<path d="M12 2c.6 5 3.4 8 8.5 8.6-5.1.6-7.9 3.6-8.5 8.6-.6-5-3.4-8-8.5-8.6C8.6 10 11.4 7 12 2Z" fill="currentColor"/><path d="M19 15.5c.25 2 1.3 3.1 3 3.3-1.7.2-2.75 1.3-3 3.2-.25-1.9-1.3-3-3-3.2 1.7-.2 2.75-1.3 3-3.3Z" fill="currentColor" opacity=".7"/>'),
  cards: I('<rect x="5" y="3" width="14" height="18" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 8.2l1.1 2.7 2.7 1.1-2.7 1.1-1.1 2.7-1.1-2.7-2.7-1.1 2.7-1.1Z" fill="currentColor"/>'),
  me: I('<circle cx="12" cy="8.5" r="3.8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
  close: I('<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  back: I('<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  chevron: I('<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  gear: I('<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.8l2 1.2 2.3-.3 1.2 2 2 1.2-.3 2.3L20.4 11v2l-1.2 2 .3 2.3-2 1.2-1.2 2-2.3-.3-2 1.2-2-1.2-2.3.3-1.2-2-2-1.2.3-2.3L3.6 13v-2l1.2-2-.3-2.3 2-1.2 1.2-2 2.3.3Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'),
  share: I('<path d="M12 15V3.5M7.5 8L12 3.5 16.5 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 12.5v6A2 2 0 0 0 7 20.5h10a2 2 0 0 0 2-2v-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  send: I('<path d="M4 11.5L20 4l-6.5 16-2.6-6.6Z" fill="currentColor"/>'),
  lock: I('<rect x="5" y="10.5" width="14" height="10" rx="2.6" fill="currentColor"/><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" fill="none" stroke="currentColor" stroke-width="2"/>'),
  check: I('<circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M7.5 12.3l3 3 6-6.3" fill="none" stroke="#0d2a1b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),
  calendar: I('<rect x="3.5" y="5" width="17" height="15.5" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'),
  heart: I('<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z" fill="currentColor"/>'),
  history: I('<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4.5v4h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 8v4.5l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
  globe: I('<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3.6 12h16.8M12 3.4c2.6 2.4 3.8 5.3 3.8 8.6s-1.2 6.2-3.8 8.6c-2.6-2.4-3.8-5.3-3.8-8.6S9.4 5.8 12 3.4Z" fill="none" stroke="currentColor" stroke-width="1.5"/>'),
  sound: I('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'),
  bell: I('<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.8h-15Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'),
  doc: I('<path d="M7 3h7l4 4v14H7Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 11h5M10 15h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'),
  mail: I('<rect x="3.5" y="5.5" width="17" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M4.5 7l7.5 6 7.5-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>'),
  trash: I('<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>'),
  restore: I('<path d="M20 12a8 8 0 1 1-2.4-5.7M20 4.5v4h-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  numbers: I('<path d="M9 4L7 20M17 4l-2 16M4.5 9h15M4 15h15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
  crown: I('<path d="M3.5 8l4.5 4 4-6.5 4 6.5 4.5-4-2 11h-13Z" fill="currentColor"/>'),
  learn: I('<path d="M12 6.5C10 5 7 4.6 3.5 5v13c3.5-.4 6.5 0 8.5 1.5 2-1.5 5-1.9 8.5-1.5V5C17 4.6 14 5 12 6.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 6.5v13" stroke="currentColor" stroke-width="1.8"/>'),
  search: I('<circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  // ── Іконки замість емодзі (той самий лінійний стиль) ──
  yesno: I('<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.1.9-1.1 1.7v.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="16.6" r="1.1" fill="currentColor"/>'),
  briefcase: I('<rect x="3.5" y="7.5" width="17" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 12.5h17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  sprout: I('<path d="M12 20.5V11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 13c0-4-3-6.5-7.5-6.5 0 4.2 3 6.5 7.5 6.5ZM12 11c0-3.6 2.6-6 6.8-6 0 3.8-2.6 6-6.8 6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  lotus: I('<path d="M12 18.5c-2.8-1.6-4-4.2-4-7 0-2.3 1.6-4.6 4-6 2.4 1.4 4 3.7 4 6 0 2.8-1.2 5.4-4 7Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.4 10.4C6 9.8 4 10.4 2.8 11.4c.8 4 4.6 7 9.2 7.1M15.6 10.4c2.4-.6 4.4 0 5.6 1-.8 4-4.6 7-9.2 7.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  home: I('<path d="M4 11l8-6.5 8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4V15h-5v5.5h-4A1.5 1.5 0 0 1 4 19Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  crystal: I('<circle cx="12" cy="10" r="6.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.7 8.3a3.6 3.6 0 0 1 2.9-2.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 17.5h10l1.2 3H5.8Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  flame: I('<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.8 3-5.6 3.8-9.3 2 1.2 3 3.2 3 5.1 1-.6 1.8-1.7 2-3 2 1.6 4.2 4.2 4.2 7.2 0 3.6-2.6 6.2-6.5 6.2Z" fill="currentColor"/><path d="M12 21c-1.7 0-2.8-1.2-2.8-2.8 0-1.8 1.6-2.6 2-4.3 1.4 1 3.6 2.4 3.6 4.3 0 1.6-1.1 2.8-2.8 2.8Z" fill="#fff3c4" opacity=".85"/>'),
  journal: I('<path d="M6 3.5h11.5A1.5 1.5 0 0 1 19 5v14.5a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V4.5a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 3.5v6.5l2-1.4 2 1.4V3.5M5 17.5a2 2 0 0 1 2-2h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  clock: I('<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  eye: I('<path d="M2.5 12C5 7.5 8.3 5.5 12 5.5s7 2 9.5 6.5c-2.5 4.5-5.8 6.5-9.5 6.5S5 16.5 2.5 12Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="currentColor"/>'),
  grid: I('<rect x="4" y="4" width="7" height="7" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><rect x="13" y="4" width="7" height="7" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><rect x="4" y="13" width="7" height="7" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.5 13.2c.3 1.6 1.2 2.5 2.8 2.8-1.6.3-2.5 1.2-2.8 2.8-.3-1.6-1.2-2.5-2.8-2.8 1.6-.3 2.5-1.2 2.8-2.8Z" fill="currentColor"/>'),
  swap: I('<path d="M7 4.5L4 7.5l3 3M4 7.5h12.5M17 13.5l3 3-3 3M20 16.5H7.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
};

// Обличчя для настрою в щоденнику — лінійні, як решта іконок
const FACE = {
  great: '<path d="M8 10.6q1-1.5 2 0M14 10.6q1-1.5 2 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.8 13.5h8.4a4.2 4.2 0 0 1-8.4 0Z" fill="currentColor"/>',
  good: '<circle cx="9" cy="10" r="1.15" fill="currentColor"/><circle cx="15" cy="10" r="1.15" fill="currentColor"/><path d="M8.5 14.2q3.5 3 7 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  calm: '<path d="M7.8 10.4q1.1 1.1 2.2 0M14 10.4q1.1 1.1 2.2 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.6 14.8q2.4 1.4 4.8 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  anxious: '<circle cx="9" cy="10.6" r="1.1" fill="currentColor"/><circle cx="15" cy="10.6" r="1.1" fill="currentColor"/><path d="M7.6 7.9l2.3.8M16.4 7.9l-2.3.8M8.5 15.6q1.2-1.2 2.4 0t2.4 0t2.3 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  sad: '<circle cx="9" cy="10.2" r="1.15" fill="currentColor"/><circle cx="15" cy="10.2" r="1.15" fill="currentColor"/><path d="M8.6 16.2q3.4-3 6.8 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
};
export const moodIcon = k => I(`<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>${FACE[k] || ''}`);
