'use strict';

// ── PostgreSQL тільки ─────────────────────────────────────────────────────────
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('[DB] DATABASE_URL не задана! Встановіть змінну оточення.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const PG_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    user_id        TEXT PRIMARY KEY,
    username       TEXT DEFAULT '',
    first_name     TEXT DEFAULT '',
    birth_date     TEXT,
    lang           TEXT DEFAULT 'ru',
    is_premium     BOOLEAN DEFAULT FALSE,
    premium_expiry BIGINT,
    ref_bonus      INTEGER DEFAULT 0,
    spell_credits  INTEGER DEFAULT 0,
    astro          JSONB,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS readings (
    id             TEXT PRIMARY KEY,
    user_id        TEXT NOT NULL,
    spread_type    TEXT NOT NULL,
    spread_name    JSONB,
    positions      JSONB,
    cards          JSONB,
    meta           JSONB,
    interpretation TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
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
  CREATE TABLE IF NOT EXISTS spell_purchases (
    user_id      TEXT NOT NULL,
    spell_id     TEXT NOT NULL,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, spell_id)
  );
`;

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(PG_SCHEMA);
    console.log('[DB] PostgreSQL: схема ініціалізована');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
