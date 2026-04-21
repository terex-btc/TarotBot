'use strict';
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { calcLifePath, getZodiac, getMoonPhase, calcPersonalYear, calcDayNumber } = require('../services/algorithmService');

const USERS_PATH = path.join(__dirname, '../storage/users.json');

function loadUsers() {
  try {
    if (!fs.existsSync(USERS_PATH)) return {};
    return JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
  } catch { return {}; }
}

function saveUsers(data) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(data, null, 2));
}

// POST /api/users/init
router.post('/init', (req, res) => {
  const { userId, username, firstName, name, birthDate, lang } = req.body;
  if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });

  const users = loadUsers();

  let astro = null;
  if (birthDate) {
    const today = new Date().toISOString().split('T')[0];
    const zodiac = getZodiac(birthDate);
    const lifePath = calcLifePath(birthDate);
    const personalYear = calcPersonalYear(birthDate, new Date().getFullYear());
    const moonPhase = getMoonPhase(today);
    astro = { zodiac, lifePath, personalYear, moonPhase };
  }

  if (!users[userId]) {
    users[userId] = {
      userId,
      username: username || '',
      firstName: firstName || name || '',
      birthDate: birthDate || null,
      lang: lang || 'ua',
      isPremium: false,
      astro,
      createdAt: new Date().toISOString()
    };
  } else {
    if (firstName || name) users[userId].firstName = firstName || name;
    if (username) users[userId].username = username;
    if (birthDate) { users[userId].birthDate = birthDate; users[userId].astro = astro; }
    if (lang) users[userId].lang = lang;
  }

  saveUsers(users);
  res.json({ ok: true, user: users[userId] });
});

// POST /api/users/:userId/premium — активація преміум (через admin key)
router.post('/:userId/premium', (req, res) => {
  const { adminKey } = req.body;
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }
  const users = loadUsers();
  if (!users[req.params.userId]) return res.status(404).json({ ok: false, error: 'User not found' });
  users[req.params.userId].isPremium = true;
  saveUsers(users);
  res.json({ ok: true, user: users[req.params.userId] });
});

// GET /api/users/:userId
router.get('/:userId', (req, res) => {
  const users = loadUsers();
  const user = users[req.params.userId];
  if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
  res.json({ ok: true, user });
});

// GET /api/users/:userId/ref — реферальна статистика
router.get('/:userId/ref', (req, res) => {
  const users = loadUsers();
  const user = users[req.params.userId];
  if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
  const refBonus = user.refBonus || 0;
  const premiumExpiry = user.premiumExpiry || null;
  res.json({ ok: true, refBonus, premiumExpiry, isPremium: user.isPremium });
});

module.exports = router;
module.exports.loadUsers = loadUsers;
module.exports.saveUsersFromServer = saveUsers;
