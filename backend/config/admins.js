'use strict';

// Список адміністраторів (Telegram userId)
const ADMIN_IDS = new Set(['369503508']);

// Карти які вважаються позитивними — для адміна тільки ці
// Виключені "важкі" карти: 12 (Повішений), 13 (Смерть), 15 (Диявол), 16 (Вежа), 18 (Місяць)
const POSITIVE_CARD_IDS = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14, 17, 19, 20, 21]);

function isAdmin(userId) {
  return ADMIN_IDS.has(String(userId));
}

module.exports = { ADMIN_IDS, POSITIVE_CARD_IDS, isAdmin };
