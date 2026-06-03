'use strict';
const path = require('path');

// ─── Вибір бекенду: PostgreSQL (якщо DATABASE_URL) або SQLite (локально) ─────
const USE_PG = !!process.env.DATABASE_URL;

// ══ SQLite-адаптер ════════════════════════════════════════════════════════════
// Надає той самий інтерфейс pool.query() що й pg, щоб решта коду не змінювалась

let pool, initDB;

if (USE_PG) {
  // ── PostgreSQL ──────────────────────────────────────────────────────────────
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  initDB = async function() {
    const client = await pool.connect();
    try {
      await client.query(PG_SCHEMA);
      console.log('[DB] PostgreSQL: схема ініціалізована');
    } finally { client.release(); }
  };

} else {
  // ── SQLite (локальна розробка) ──────────────────────────────────────────────
  const Database = require('better-sqlite3');
  const DB_PATH  = path.join(__dirname, 'storage', 'tarot.db');
  const db       = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Конвертація PostgreSQL-синтаксису → SQLite
  function pgToSqlite(sql) {
    return sql
      // $1 $2 ... → ?
      .replace(/\$\d+/g, '?')
      // TIMESTAMPTZ, JSONB, BOOLEAN → TEXT / INTEGER
      .replace(/TIMESTAMPTZ/gi, 'TEXT')
      .replace(/JSONB/gi, 'TEXT')
      .replace(/BOOLEAN\s+DEFAULT\s+FALSE/gi, 'INTEGER DEFAULT 0')
      .replace(/BOOLEAN\s+DEFAULT\s+TRUE/gi,  'INTEGER DEFAULT 1')
      .replace(/BOOLEAN/gi, 'INTEGER')
      .replace(/BIGINT/gi, 'INTEGER')
      // NOW() → datetime('now')
      .replace(/NOW\(\)/gi, "datetime('now')")
      // COALESCE(NULLIF(?,\s*''),\s*\w+) — залишаємо як є (SQLite підтримує)
      // RETURNING * — відрізаємо (обробляємо після)
      .replace(/\s+RETURNING\s+\*/gi, ' __RETURNING__');
  }

  // Визначаємо тип запиту
  function queryType(sql) {
    const s = sql.trim().toUpperCase();
    if (s.startsWith('SELECT')) return 'select';
    if (s.startsWith('INSERT')) return 'insert';
    if (s.startsWith('UPDATE')) return 'update';
    if (s.startsWith('DELETE')) return 'delete';
    if (s.startsWith('CREATE') || s.startsWith('DROP') || s.startsWith('ALTER')) return 'ddl';
    return 'other';
  }

  // Витягуємо таблицю і PK-умову для RETURNING після INSERT/UPDATE
  function getTableAndPK(sql) {
    const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i);
    const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET/i);
    const table = (insertMatch || updateMatch)?.[1]?.toLowerCase();
    // Визначаємо PRIMARY KEY таблиці
    const pks = { users: 'user_id', readings: 'id', support_messages: 'id',
                  tg_msg_map: 'tg_message_id', spell_purchases: null };
    return { table, pk: pks[table] };
  }

  // Серіалізація параметрів (JSON-об'єкти → рядки)
  function serializeParams(params) {
    return params.map(p => {
      if (p === null || p === undefined) return null;
      if (typeof p === 'object') return JSON.stringify(p);
      return p;
    });
  }

  // Десеріалізація рядка (JSON-поля → об'єкти)
  function deserializeRow(row) {
    if (!row) return null;
    const JSON_COLS = ['astro', 'spread_name', 'positions', 'cards', 'meta'];
    const out = { ...row };
    for (const col of JSON_COLS) {
      if (typeof out[col] === 'string') {
        try { out[col] = JSON.parse(out[col]); } catch (_) {}
      }
    }
    return out;
  }

  // pool.query() — сумісний з pg
  pool = {
    query: function(sql, params = []) {
      try {
        const converted = pgToSqlite(sql);
        const hasReturning = converted.includes('__RETURNING__');
        const cleanSql = converted.replace(' __RETURNING__', '');
        const type = queryType(cleanSql);
        const serialized = serializeParams(params);

        // DDL (CREATE TABLE, CREATE INDEX) — може бути кілька statements
        if (type === 'ddl') {
          // better-sqlite3 не підтримує кілька statements в одному exec через query,
          // але exec() підтримує
          db.exec(cleanSql);
          return Promise.resolve({ rows: [], rowCount: 0 });
        }

        // SELECT
        if (type === 'select') {
          const stmt  = db.prepare(cleanSql);
          const rows  = stmt.all(...serialized).map(deserializeRow);
          return Promise.resolve({ rows, rowCount: rows.length });
        }

        // INSERT / UPDATE / DELETE з RETURNING
        const stmt   = db.prepare(cleanSql);
        const result = stmt.run(...serialized);

        if (hasReturning) {
          const { table, pk } = getTableAndPK(sql);
          if (table && pk) {
            // Для INSERT — lastInsertRowid може не відповідати TEXT PK, шукаємо по параметру
            // Простіше: беремо перший параметр (user_id / id)
            const pkVal = serialized[0];
            const selStmt = db.prepare(`SELECT * FROM ${table} WHERE ${pk} = ?`);
            const row     = selStmt.get(pkVal);
            return Promise.resolve({ rows: row ? [deserializeRow(row)] : [], rowCount: result.changes });
          }
          // Для таблиць без чіткого PK (spell_purchases)
          return Promise.resolve({ rows: [], rowCount: result.changes });
        }

        return Promise.resolve({ rows: [], rowCount: result.changes });
      } catch (err) {
        console.error('[SQLite] query error:', err.message, '\nSQL:', sql.slice(0, 200));
        return Promise.reject(err);
      }
    },
    // pg має pool.connect() для transactional clients — заглушка
    connect: function() {
      return Promise.resolve({
        query:   (s, p) => pool.query(s, p),
        release: () => {},
      });
    },
  };

  initDB = async function() {
    // SQLite схема (без PostgreSQL-специфіки)
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id        TEXT PRIMARY KEY,
        username       TEXT DEFAULT '',
        first_name     TEXT DEFAULT '',
        birth_date     TEXT,
        lang           TEXT DEFAULT 'ru',
        is_premium     INTEGER DEFAULT 0,
        premium_expiry INTEGER,
        ref_bonus      INTEGER DEFAULT 0,
        spell_credits  INTEGER DEFAULT 0,
        astro          TEXT,
        created_at     TEXT DEFAULT (datetime('now')),
        updated_at     TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS readings (
        id             TEXT PRIMARY KEY,
        user_id        TEXT NOT NULL,
        spread_type    TEXT NOT NULL,
        spread_name    TEXT,
        positions      TEXT,
        cards          TEXT,
        meta           TEXT,
        interpretation TEXT,
        created_at     TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS readings_user_id_idx ON readings(user_id);
      CREATE INDEX IF NOT EXISTS readings_created_idx ON readings(user_id, spread_type, created_at DESC);

      CREATE TABLE IF NOT EXISTS support_messages (
        id             TEXT PRIMARY KEY,
        user_id        TEXT NOT NULL,
        from_type      TEXT NOT NULL,
        text           TEXT NOT NULL,
        tg_message_id  INTEGER,
        created_at     TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS support_user_idx ON support_messages(user_id, created_at);

      CREATE TABLE IF NOT EXISTS tg_msg_map (
        tg_message_id  INTEGER PRIMARY KEY,
        user_id        TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS spell_purchases (
        user_id      TEXT NOT NULL,
        spell_id     TEXT NOT NULL,
        purchased_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (user_id, spell_id)
      );
    `);
    console.log('[DB] SQLite: схема ініціалізована →', DB_PATH);
  };
}

// ── PostgreSQL DDL-схема (використовується тільки якщо USE_PG) ────────────────
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

module.exports = { pool, initDB };
