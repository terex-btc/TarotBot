'use strict';

// ── Нумерологія ────────────────────────────────────────────────────────────
function reduceToSingleDigit(n) {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split('').reduce((a, b) => a + parseInt(b), 0);
  }
  return n;
}

function calcLifePath(birthDate) {
  // birthDate: "YYYY-MM-DD"
  const digits = birthDate.replace(/-/g, '').split('').map(Number);
  const sum = digits.reduce((a, b) => a + b, 0);
  return reduceToSingleDigit(sum);
}

function calcPersonalYear(birthDate, year) {
  const d = new Date(birthDate);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const str = `${month}${day}${year}`;
  const sum = str.split('').reduce((a, b) => a + parseInt(b), 0);
  return reduceToSingleDigit(sum);
}

function calcDayNumber(dateStr) {
  // dateStr: "YYYY-MM-DD"
  const sum = dateStr.replace(/-/g, '').split('').reduce((a, b) => a + parseInt(b), 0);
  return reduceToSingleDigit(sum);
}

function calcPersonalDay(birthDate, targetDate) {
  const b = new Date(birthDate);
  const t = new Date(targetDate);
  const month = b.getMonth() + 1;
  const day = b.getDate();
  const year = t.getFullYear();
  const tDay = t.getDate();
  const tMonth = t.getMonth() + 1;
  const str = `${month}${day}${year}${tDay}${tMonth}`;
  const sum = str.split('').reduce((a, b) => a + parseInt(b), 0);
  return reduceToSingleDigit(sum);
}

// ── Знаки зодиака (русский) ────────────────────────────────────────────────
const ZODIAC_SIGNS = [
  { name: 'Козерог',   nameEn: 'Capricorn',    emoji: '♑', start: [1,1],   end: [1,19],  tarotCard: 15, element: 'Земля',   planet: 'Сатурн'   },
  { name: 'Водолей',   nameEn: 'Aquarius',     emoji: '♒', start: [1,20],  end: [2,18],  tarotCard: 17, element: 'Воздух',  planet: 'Уран'     },
  { name: 'Рыбы',      nameEn: 'Pisces',       emoji: '♓', start: [2,19],  end: [3,20],  tarotCard: 18, element: 'Вода',    planet: 'Нептун'   },
  { name: 'Овен',      nameEn: 'Aries',        emoji: '♈', start: [3,21],  end: [4,19],  tarotCard: 4,  element: 'Огонь',   planet: 'Марс'     },
  { name: 'Телец',     nameEn: 'Taurus',       emoji: '♉', start: [4,20],  end: [5,20],  tarotCard: 5,  element: 'Земля',   planet: 'Венера'   },
  { name: 'Близнецы',  nameEn: 'Gemini',       emoji: '♊', start: [5,21],  end: [6,20],  tarotCard: 6,  element: 'Воздух',  planet: 'Меркурий' },
  { name: 'Рак',       nameEn: 'Cancer',       emoji: '♋', start: [6,21],  end: [7,22],  tarotCard: 7,  element: 'Вода',    planet: 'Луна'     },
  { name: 'Лев',       nameEn: 'Leo',          emoji: '♌', start: [7,23],  end: [8,22],  tarotCard: 8,  element: 'Огонь',   planet: 'Солнце'   },
  { name: 'Дева',      nameEn: 'Virgo',        emoji: '♍', start: [8,23],  end: [9,22],  tarotCard: 9,  element: 'Земля',   planet: 'Меркурий' },
  { name: 'Весы',      nameEn: 'Libra',        emoji: '♎', start: [9,23],  end: [10,22], tarotCard: 11, element: 'Воздух',  planet: 'Венера'   },
  { name: 'Скорпион',  nameEn: 'Scorpio',      emoji: '♏', start: [10,23], end: [11,21], tarotCard: 13, element: 'Вода',    planet: 'Плутон'   },
  { name: 'Стрелец',   nameEn: 'Sagittarius',  emoji: '♐', start: [11,22], end: [12,21], tarotCard: 14, element: 'Огонь',   planet: 'Юпитер'   },
  { name: 'Козерог',   nameEn: 'Capricorn',    emoji: '♑', start: [12,22], end: [12,31], tarotCard: 15, element: 'Земля',   planet: 'Сатурн'   },
];

function getZodiac(birthDate) {
  const d = new Date(birthDate);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  for (const z of ZODIAC_SIGNS) {
    const [sm, sd] = z.start;
    const [em, ed] = z.end;
    if ((month === sm && day >= sd) || (month === em && day <= ed)) {
      return z;
    }
  }
  return ZODIAC_SIGNS[0];
}

// ── Фаза місяця ────────────────────────────────────────────────────────────
function getMoonPhase(dateStr) {
  const date = new Date(dateStr);
  // Відома дата нового місяця: 6 січня 2000
  const knownNewMoon = new Date('2000-01-06');
  const lunarCycle = 29.53058867;
  const daysDiff = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
  const phase = ((daysDiff % lunarCycle) + lunarCycle) % lunarCycle;

  if (phase < 1.85)  return { name: 'Новолуние',          emoji: '🌑', energy: 'new',     reversalBonus: 0.15 };
  if (phase < 7.38)  return { name: 'Растущий месяц',     emoji: '🌒', energy: 'waxing',  reversalBonus: -0.05 };
  if (phase < 9.22)  return { name: 'Первая четверть',    emoji: '🌓', energy: 'first',   reversalBonus: 0 };
  if (phase < 14.77) return { name: 'Растущая луна',      emoji: '🌔', energy: 'gibbous', reversalBonus: -0.1 };
  if (phase < 16.61) return { name: 'Полнолуние',         emoji: '🌕', energy: 'full',    reversalBonus: -0.2 };
  if (phase < 22.15) return { name: 'Убывающая луна',     emoji: '🌖', energy: 'waning',  reversalBonus: 0.05 };
  if (phase < 23.99) return { name: 'Последняя четверть', emoji: '🌗', energy: 'last',    reversalBonus: 0.1 };
  return                    { name: 'Тёмная луна',         emoji: '🌘', energy: 'dark',    reversalBonus: 0.2 };
}

// ── Сідований рандом (детермінований) ─────────────────────────────────────
function hashSeed(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(h >>> 0);
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967296;
  };
}

// ── Карти за нумерологічним числом (Шлях Життя) ────────────────────────────
const LIFE_PATH_CARDS = {
  1:  [1, 0],      // Маг, Блазень — нові початки
  2:  [2, 18],     // Верховна Жриця, Місяць — інтуїція
  3:  [3, 10],     // Імператриця, Колесо — творчість, удача
  4:  [4, 16],     // Імператор, Вежа — структура
  5:  [5, 6],      // Єрофант, Закохані — пошук, вибір
  6:  [6, 3],      // Закохані, Імператриця — гармонія
  7:  [7, 9],      // Колісниця, Відлюдник — мудрість
  8:  [8, 11],     // Сила, Справедливість — влада
  9:  [9, 21],     // Відлюдник, Світ — завершення
  11: [2, 17],     // Верховна Жриця, Зірка — просвітлення
  22: [0, 21],     // Блазень, Світ — майстер-число
  33: [3, 14],     // Імператриця, Поміркованість — вчитель
};

// ── Основна функція вибору карт ────────────────────────────────────────────
function selectCards(birthDate, targetDate, spreadType, count) {
  const lifePath = calcLifePath(birthDate);
  const zodiac = getZodiac(birthDate);
  const personalDay = calcPersonalDay(birthDate, targetDate);
  const dayNumber = calcDayNumber(targetDate);
  const moonPhase = getMoonPhase(targetDate);
  const personalYear = calcPersonalYear(birthDate, new Date(targetDate).getFullYear());

  // Seed: унікальний для юзера + дату + тип розкладу
  const seedStr = `${birthDate}|${targetDate}|${spreadType}`;
  const seed = hashSeed(seedStr);
  const rng = seededRandom(seed);

  // Ваги карт (0–21)
  const weights = new Array(22).fill(1.0);

  // Підсилюємо карту зодіаку
  weights[zodiac.tarotCard] += 3.0;

  // Підсилюємо карти шляху життя
  const lpCards = LIFE_PATH_CARDS[lifePath] || LIFE_PATH_CARDS[lifePath % 9 || 9];
  if (lpCards) lpCards.forEach(id => { if (id < 22) weights[id] += 2.0; });

  // Карта особистого дня
  const pdCard = personalDay <= 9 ? personalDay : personalDay % 9 || 9;
  if (pdCard < 22) weights[pdCard] += 1.5;

  // Карта особистого року
  const pyCard = personalYear <= 9 ? personalYear : personalYear % 9;
  if (pyCard < 22) weights[pyCard] += 1.0;

  // Для розкладу "кохання" підсилюємо Закоханих і Зірку
  if (spreadType === 'love') {
    weights[6]  += 3.0; // Закохані
    weights[17] += 2.0; // Зірка
    weights[3]  += 1.5; // Імператриця
    weights[2]  += 1.5; // Верховна Жриця
  }

  // Для місячного розкладу — карта місяця + колесо
  if (spreadType === 'month') {
    weights[18] += 2.5; // Місяць
    weights[10] += 2.0; // Колесо Фортуни
    weights[14] += 1.5; // Поміркованість
  }

  // Для річного — Світ і Сонце
  if (spreadType === 'year') {
    weights[21] += 2.0; // Світ
    weights[19] += 2.0; // Сонце
    weights[10] += 2.0; // Колесо Фортуни
  }

  // Зважений вибір без повторень
  const selected = [];
  const availableWeights = [...weights];

  for (let i = 0; i < count; i++) {
    const totalWeight = availableWeights.reduce((a, b) => a + b, 0);
    let pick = rng() * totalWeight;
    let idx = 0;
    for (let j = 0; j < availableWeights.length; j++) {
      pick -= availableWeights[j];
      if (pick <= 0) { idx = j; break; }
    }
    selected.push(idx);
    availableWeights[idx] = 0; // не повторюємо
  }

  // Визначаємо перевернутість (фаза місяця + personalDay)
  const baseReversalChance = 0.25 + moonPhase.reversalBonus;
  const reversalSeed = hashSeed(`${seedStr}|reversed`);
  const revRng = seededRandom(reversalSeed);

  return {
    cardIds: selected,
    reversed: selected.map(() => revRng() < Math.max(0.05, Math.min(0.5, baseReversalChance))),
    meta: { lifePath, zodiac, personalDay, personalYear, dayNumber, moonPhase }
  };
}

// ── Генерація персоналізованого коментаря ─────────────────────────────────
function generateInterpretation(meta, spreadType, lang = 'ua') {
  const { lifePath, zodiac, personalDay, personalYear, moonPhase } = meta;

  const texts = {
    ua: {
      daily: [
        `Сьогодні — ваш особистий день числа ${personalDay}. ${moonPhase.emoji} ${moonPhase.name} підсилює ваш знак ${zodiac.emoji} ${zodiac.name}.`,
        `Ваш Шлях Життя ${lifePath} і сьогоднішні зірки вказують на важливий момент для знаку ${zodiac.emoji} ${zodiac.name}.`,
        `Енергія ${moonPhase.name} у поєднанні з вашим особистим числом ${personalDay} відкриває нові можливості.`,
      ],
      love: [
        `Для знаку ${zodiac.emoji} ${zodiac.name} під ${moonPhase.emoji} ${moonPhase.name} у коханні зараз особливий час.`,
        `Ваш Шлях Життя ${lifePath} і планета ${zodiac.planet} підказують: будьте відкриті до нових зустрічей.`,
        `Особистий рік ${personalYear} несе важливі зміни у ваших стосунках, ${zodiac.emoji} ${zodiac.name}.`,
      ],
      month: [
        `Для ${zodiac.emoji} ${zodiac.name} цей місяць під впливом ${zodiac.planet} і числа ${personalYear}.`,
        `${moonPhase.emoji} ${moonPhase.name} розкриває цикл ${zodiac.element}ного знаку ${zodiac.emoji}.`,
        `Особистий рік ${personalYear} з'єднується з вашим Шляхом Життя ${lifePath} у цьому місяці.`,
      ],
      year: [
        `Ваш особистий рік ${personalYear} — це ключовий цикл для ${zodiac.emoji} ${zodiac.name}.`,
        `Шлях Життя ${lifePath} у рік ${personalYear} відкриває новий розділ вашої долі.`,
        `${zodiac.planet} керує вашим ${zodiac.emoji} знаком, і цей рік стане переломним.`,
      ],
    },
    ru: {
      daily: [
        `Сегодня — ваш личный день числа ${personalDay}. ${moonPhase.emoji} ${moonPhase.name} усиливает ваш знак ${zodiac.emoji} ${zodiac.name}.`,
        `Ваш Путь Жизни ${lifePath} и сегодняшние звёзды указывают на важный момент для ${zodiac.emoji} ${zodiac.name}.`,
        `Энергия ${moonPhase.name} вместе с вашим личным числом ${personalDay} открывает новые возможности.`,
      ],
      love: [
        `Для знака ${zodiac.emoji} ${zodiac.name} под ${moonPhase.emoji} ${moonPhase.name} в любви особое время.`,
        `Ваш Путь Жизни ${lifePath} и планета ${zodiac.planet} подсказывают: будьте открыты к новым встречам.`,
        `Личный год ${personalYear} несёт важные изменения в ваших отношениях, ${zodiac.emoji} ${zodiac.name}.`,
      ],
      month: [
        `Для ${zodiac.emoji} ${zodiac.name} этот месяц под влиянием ${zodiac.planet} и числа ${personalYear}.`,
        `${moonPhase.emoji} ${moonPhase.name} раскрывает цикл ${zodiac.element}ного знака ${zodiac.emoji}.`,
        `Личный год ${personalYear} соединяется с вашим Путём Жизни ${lifePath} в этом месяце.`,
      ],
      year: [
        `Ваш личный год ${personalYear} — ключевой цикл для ${zodiac.emoji} ${zodiac.name}.`,
        `Путь Жизни ${lifePath} в год ${personalYear} открывает новую главу вашей судьбы.`,
        `${zodiac.planet} управляет вашим ${zodiac.emoji} знаком, и этот год станет переломным.`,
      ],
    }
  };

  const langTexts = texts['ru']; // всегда русский
  const arr = langTexts[spreadType] || langTexts.daily;
  // Детерміновано вибираємо текст
  const idx = (meta.personalDay + meta.lifePath) % arr.length;
  return arr[idx];
}

module.exports = {
  calcLifePath,
  calcPersonalYear,
  calcDayNumber,
  calcPersonalDay,
  getZodiac,
  getMoonPhase,
  selectCards,
  generateInterpretation,
};
