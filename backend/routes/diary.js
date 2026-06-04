'use strict';
const express = require('express');
const router  = express.Router();
const { pool } = require('../db');

// GET /api/diary/:userId
router.get('/:userId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, text, moon_emoji, moon_name, entry_date, created_at
       FROM diary_entries WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,
      [req.params.userId]
    );
    res.json({ ok: true, entries: rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/diary/:userId
router.post('/:userId', async (req, res) => {
  try {
    const { text, moonEmoji, moonName } = req.body;
    if (!text?.trim()) return res.status(400).json({ ok: false, error: 'text required' });
    const entryDate = new Date().toISOString().split('T')[0];
    const { rows } = await pool.query(
      `INSERT INTO diary_entries (user_id, text, moon_emoji, moon_name, entry_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.userId, text.slice(0, 1000), moonEmoji || '🌙', moonName || '', entryDate]
    );
    res.json({ ok: true, entry: rows[0] });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// DELETE /api/diary/:userId/:id
router.delete('/:userId/:id', async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM diary_entries WHERE user_id=$1 AND id=$2`,
      [req.params.userId, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
