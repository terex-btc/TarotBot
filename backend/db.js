'use strict';

// ── PostgreSQL тільки ─────────────────────────────────────────────────────────
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('[DB] УВАГА: DATABASE_URL не задана! Запити до БД будуть падати.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/tarot',
  ssl: process.env.DATABASE_URL?.includes('railway') || process.env.DATABASE_URL?.includes('amazonaws')
    ? { rejectUnauthorized: false }
    : false,
  max:              5,    // Railway Free: максимум 5 одночасних з'єднань
  idleTimeoutMillis: 30000, // закриваємо idle-з'єднання через 30 сек
  connectionTimeoutMillis: 5000, // таймаут на підключення 5 сек
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
  CREATE TABLE IF NOT EXISTS diary_entries (
    id         SERIAL PRIMARY KEY,
    user_id    TEXT NOT NULL,
    text       TEXT NOT NULL,
    moon_emoji TEXT DEFAULT '🌙',
    moon_name  TEXT DEFAULT '',
    entry_date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS diary_user_idx ON diary_entries(user_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS payments_log (
    id          SERIAL PRIMARY KEY,
    user_id     TEXT NOT NULL,
    payload     TEXT NOT NULL,
    stars       INTEGER NOT NULL,
    status      TEXT DEFAULT 'success',
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS payments_log_user_idx ON payments_log(user_id, created_at DESC);
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
