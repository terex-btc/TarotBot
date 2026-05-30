'use strict';
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Ініціалізація схеми БД
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id      TEXT PRIMARY KEY,
        username     TEXT DEFAULT '',
        first_name   TEXT DEFAULT '',
        birth_date   TEXT,
        lang         TEXT DEFAULT 'ru',
        is_premium   BOOLEAN DEFAULT FALSE,
        premium_expiry BIGINT,
        ref_bonus    INTEGER DEFAULT 0,
        astro        JSONB,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        updated_at   TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS readings (
        id            TEXT PRIMARY KEY,
        user_id       TEXT NOT NULL,
        spread_type   TEXT NOT NULL,
        spread_name   JSONB,
        positions     JSONB,
        cards         JSONB,
        meta          JSONB,
        interpretation TEXT,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS readings_user_id_idx ON readings(user_id);
      CREATE INDEX IF NOT EXISTS readings_created_idx ON readings(user_id, spread_type, created_at DESC);

      CREATE TABLE IF NOT EXISTS support_messages (
        id             TEXT PRIMARY KEY,
        user_id        TEXT NOT NULL,
        from_type      TEXT NOT NULL,
        text           TEXT NOT NULL,
        tg_message_id  INTEGER,
        created_at     TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS support_user_idx ON support_messages(user_id, created_at);

      CREATE TABLE IF NOT EXISTS tg_msg_map (
        tg_message_id  INTEGER PRIMARY KEY,
        user_id        TEXT NOT NULL
      );
    `);
    console.log('[DB] Схема ініціалізована');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
