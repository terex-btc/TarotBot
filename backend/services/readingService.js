'use strict';
const { pool }      = require('../db');
const { MAJOR_ARCANA } = require('../config/tarotCards');
const algo          = require('./algorithmService');
const { isAdmin }   = require('../config/admins');
const { bumpActivity } = require('../routes/admin');

const SPREAD_TYPES = {
  daily: {
    name: { ua: 'Карта дня', ru: 'Карта дня', en: 'Daily Card' },
    count: 1, premium: false,
    positions: [{ ua: 'Ваш день', ru: 'Ваш день', en: 'Your day' }]
  },
  three_card: {
    name: { ua: 'Три карти', ru: 'Три карты', en: 'Three Cards' },
    count: 3, premium: true,
    positions: [
      { ua: 'Минуле', ru: 'Прошлое', en: 'Past' },
      { ua: 'Теперішнє', ru: 'Настоящее', en: 'Present' },
      { ua: 'Майбутнє', ru: 'Будущее', en: 'Future' }
    ]
  },
  love: {
    name: { ua: '❤️ Кохання', ru: '❤️ Любовь', en: '❤️ Love' },
    count: 4, premium: true,
    positions: [
      { ua: 'Ваш стан', ru: 'Ваше состояние', en: 'Your feelings' },
      { ua: 'Партнер', ru: 'Партнёр', en: 'Partner' },
      { ua: "Зв'язок", ru: 'Связь', en: 'Connection' },
      { ua: 'Потенціал', ru: 'Потенциал', en: 'Potential' }
    ]
  },
  month: {
    name: { ua: '📅 Місяць', ru: '📅 Месяц', en: '📅 Month' },
    count: 4, premium: true,
    positions: [
      { ua: 'Загальна енергія', ru: 'Общая энергия', en: 'Overall energy' },
      { ua: 'Виклик місяця', ru: 'Вызов месяца', en: 'Main challenge' },
      { ua: 'Можливості', ru: 'Возможности', en: 'Opportunities' },
      { ua: 'Підсумок', ru: 'Итог', en: 'Outcome' }
    ]
  },
  yes_no: {
    name: { ua: 'Так чи ні', ru: 'Да или нет', en: 'Yes or No' },
    count: 1, premium: true,
    positions: [{ ua: 'Відповідь', ru: 'Ответ', en: 'Answer' }]
  },
  celtic: {
    name: { ua: 'Кельтський хрест', ru: 'Кельтский крест', en: 'Celtic Cross' },
    count: 10, premium: true,
    positions: [
      { ua: 'Ситуація', ru: 'Ситуация', en: 'Situation' },
      { ua: 'Виклик', ru: 'Вызов', en: 'Challenge' },
      { ua: 'Корінь', ru: 'Корень', en: 'Foundation' },
      { ua: 'Нещодавнє минуле', ru: 'Недавнее прошлое', en: 'Recent past' },
      { ua: 'Мета', ru: 'Цель', en: 'Crown' },
      { ua: 'Найближче майбутнє', ru: 'Ближайшее будущее', en: 'Near future' },
      { ua: 'Ти', ru: 'Ты', en: 'Self' },
      { ua: 'Оточення', ru: 'Окружение', en: 'Environment' },
      { ua: 'Надії та страхи', ru: 'Надежды и страхи', en: 'Hopes and fears' },
      { ua: 'Підсумок', ru: 'Итог', en: 'Final outcome' }
    ]
  },
  year: {
    name: { ua: '🌟 Рік', ru: '🌟 Год', en: '🌟 Year' },
    count: 6, premium: true,
    positions: [
      { ua: 'Тема року', ru: 'Тема года', en: 'Theme of the year' },
      { ua: 'Виклики', ru: 'Вызовы', en: 'Challenges' },
      { ua: 'Можливості', ru: 'Возможности', en: 'Opportunities' },
      { ua: 'Кохання', ru: 'Любовь', en: 'Love' },
      { ua: 'Кар\'єра', ru: 'Карьера', en: 'Career' },
      { ua: 'Результат', ru: 'Результат', en: 'Outcome' }
    ]
  }
};

// Тематичні розклади застосунку — той самий файл читає фронтенд (mobile/www/js/catalog.js)
const SPREAD_CATALOG = require('../../mobile/www/data/spreads.json');
for (const s of SPREAD_CATALOG.spreads) {
  SPREAD_TYPES[s.id] = { name: s.name, count: s.positions.length, premium: !s.free, positions: s.positions };
}

async function createReading(userId, birthDate, spreadType, targetDate, lang, { salt = '', localDate = null } = {}) {
  const spread = SPREAD_TYPES[spreadType];
  if (!spread) throw new Error('Unknown spread type');

  const today  = targetDate || new Date().toISOString().split('T')[0];
  const adminMode = isAdmin(userId);
  const { cardIds, reversed, meta } = algo.selectCards(birthDate, today, spreadType, spread.count, adminMode, salt);
  if (localDate) meta.localDate = localDate;   // «день» клієнта (Lunara) — для карти дня за місцевим часом
  const cards  = cardIds.map((id, i) => ({ ...MAJOR_ARCANA[id], isReversed: reversed[i] }));
  const { text: interpretation, verdict } = algo.generateInterpretation(meta, spreadType, cards);

  const id = Date.now().toString();
  const { rows } = await pool.query(`
    INSERT INTO readings (id, user_id, spread_type, spread_name, positions, cards, meta, interpretation)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *
  `, [id, userId, spreadType,
      JSON.stringify(spread.name),
      JSON.stringify(spread.positions),
      JSON.stringify(cards),
      JSON.stringify(meta),
      interpretation]);

  // Логуємо активність (fire-and-forget)
  pool.query(
    `INSERT INTO activity_log (user_id, event_type, meta) VALUES ($1,'reading',$2)`,
    [userId, spreadType]
  ).catch(() => {});
  bumpActivity?.();

  return { ...rowToReading(rows[0]), verdict };
}

async function getUserReadings(userId, limit = 10) {
  const { rows } = await pool.query(
    `SELECT * FROM readings WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows.map(rowToReading);
}

async function getTodayReading(userId, spreadType) {
  const { rows } = await pool.query(`
    SELECT * FROM readings
    WHERE user_id=$1 AND spread_type=$2
      AND created_at >= CURRENT_DATE::timestamptz
      AND created_at <  (CURRENT_DATE + interval '1 day')::timestamptz
    ORDER BY created_at DESC LIMIT 1
  `, [userId, spreadType]);
  return rows.length ? rowToReading(rows[0]) : null;
}

function rowToReading(row) {
  return {
    id:             row.id,
    userId:         row.user_id,
    spreadType:     row.spread_type,
    spreadName:     row.spread_name,
    positions:      row.positions,
    cards:          row.cards,
    meta:           row.meta,
    interpretation: row.interpretation,
    note:           row.note || '',
    mood:           row.mood || '',
    outcome:        row.outcome || '',
    createdAt:      row.created_at,
  };
}

// Карта дня за місцевою датою клієнта (Lunara)
async function getReadingByLocalDate(userId, spreadType, localDate) {
  const { rows } = await pool.query(`
    SELECT * FROM readings WHERE user_id=$1 AND spread_type=$2 AND meta->>'localDate' = $3
    ORDER BY created_at DESC LIMIT 1
  `, [userId, spreadType, localDate]);
  return rows.length ? rowToReading(rows[0]) : null;
}

// Щоденник: нотатка / настрій / «чи справдилось» — тільки свій розклад
async function updateReadingJournal(userId, readingId, { note, mood, outcome }) {
  const { rows } = await pool.query(`
    UPDATE readings SET
      note    = COALESCE($3, note),
      mood    = COALESCE($4, mood),
      outcome = COALESCE($5, outcome)
    WHERE id=$2 AND user_id=$1 RETURNING *
  `, [userId, readingId, note, mood, outcome]);
  return rows[0] ? rowToReading(rows[0]) : null;
}

module.exports = { createReading, getUserReadings, getTodayReading, getReadingByLocalDate, updateReadingJournal, SPREAD_TYPES };
