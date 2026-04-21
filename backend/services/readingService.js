'use strict';
const fs = require('fs');
const path = require('path');
const { MAJOR_ARCANA } = require('../config/tarotCards');
const algo = require('./algorithmService');
const { isAdmin } = require('../config/admins');

const STORAGE_PATH = path.join(__dirname, '../storage/readings.json');

function loadReadings() {
  try {
    if (!fs.existsSync(STORAGE_PATH)) return {};
    return JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf8'));
  } catch { return {}; }
}

function saveReadings(data) {
  fs.writeFileSync(STORAGE_PATH, JSON.stringify(data, null, 2));
}

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

function createReading(userId, birthDate, spreadType, targetDate, lang) {
  const spread = SPREAD_TYPES[spreadType];
  if (!spread) throw new Error('Unknown spread type');

  const today = targetDate || new Date().toISOString().split('T')[0];

  // Алгоритм підбору карт
  const adminMode = isAdmin(userId);
  const { cardIds, reversed, meta } = algo.selectCards(birthDate, today, spreadType, spread.count, adminMode);
  const cards = cardIds.map((id, i) => ({ ...MAJOR_ARCANA[id], isReversed: reversed[i] }));

  // Персоналізована інтерпретація
  const interpretation = algo.generateInterpretation(meta, spreadType, 'ru');

  const reading = {
    id: Date.now().toString(),
    userId,
    spreadType,
    spreadName: spread.name,
    positions: spread.positions,
    cards,
    meta,
    interpretation,
    createdAt: new Date().toISOString()
  };

  const readings = loadReadings();
  if (!readings[userId]) readings[userId] = [];
  readings[userId].unshift(reading);
  readings[userId] = readings[userId].slice(0, 50);
  saveReadings(readings);

  return reading;
}

function getUserReadings(userId, limit = 10) {
  const readings = loadReadings();
  return (readings[userId] || []).slice(0, limit);
}

function getTodayReading(userId, spreadType) {
  const readings = loadReadings();
  const today = new Date().toDateString();
  return (readings[userId] || []).find(r =>
    r.spreadType === spreadType &&
    new Date(r.createdAt).toDateString() === today
  );
}

module.exports = { createReading, getUserReadings, getTodayReading, SPREAD_TYPES };
