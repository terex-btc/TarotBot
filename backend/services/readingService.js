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
      { ua: 'Ваш стан', ru: 'Ваше состояние', en: 'Your state' },
      { ua: 'Партнер', ru: 'Партнёр', en: 'Partner' },
      { ua: "Зв'язок", ru: 'Связь', en: 'Connection' },
      { ua: 'Потенціал', ru: 'Потенциал', en: 'Potential' }
    ]
  },
  month: {
    name: { ua: '📅 Місяць', ru: '📅 Месяц', en: '📅 Month' },
    count: 4, premium: true,
    positions: [
      { ua: 'Загальна енергія', ru: 'Общая энергия', en: 'General energy' },
      { ua: 'Виклик місяця', ru: 'Вызов месяца', en: 'Month challenge' },
      { ua: 'Можливості', ru: 'Возможности', en: 'Opportunities' },
      { ua: 'Підсумок', ru: 'Итог', en: 'Outcome' }
    ]
  },
  year: {
    name: { ua: '🌟 Рік', ru: '🌟 Год', en: '🌟 Year' },
    count: 6, premium: true,
    positions: [
      { ua: 'Тема року', ru: 'Тема года', en: 'Year theme' },
      { ua: 'Виклики', ru: 'Вызовы', en: 'Challenges' },
      { ua: 'Можливості', ru: 'Возможности', en: 'Opportunities' },
      { ua: 'Кохання', ru: 'Любовь', en: 'Love' },
      { ua: 'Кар\'єра', ru: 'Карьера', en: 'Career' },
      { ua: 'Результат', ru: 'Результат', en: 'Outcome' }
    ]
  }
};

async function createReading(userId, birthDate, spreadType, targetDate, lang) {
  const spread = SPREAD_TYPES[spreadType];
  if (!spread) throw new Error('Unknown spread type');

  const today  = targetDate || new Date().toISOString().split('T')[0];
  const adminMode = isAdmin(userId);
  const { cardIds, reversed, meta } = algo.selectCards(birthDate, today, spreadType, spread.count, adminMode);
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
    createdAt:      row.created_at,
  };
}

module.exports = { createReading, getUserReadings, getTodayReading, SPREAD_TYPES };
