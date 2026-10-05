import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'dueradar.db';

const NOW = `(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

/**
 * Ordered schema migrations. Migration N moves the database from version N to
 * N + 1. Never edit a migration that has shipped; append a new one instead.
 */
const MIGRATIONS: readonly ((db: SQLiteDatabase) => Promise<void>)[] = [
  // v1: core tables (V1 subscriptions and V2 warranties).
  async (db) => {
    await db.execAsync(`
      CREATE TABLE items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        schedule_type TEXT NOT NULL,
        amount_cents INTEGER,
        currency TEXT NOT NULL DEFAULT 'USD',
        interval_unit TEXT,
        interval_count INTEGER,
        start_date TEXT,
        due_date TEXT,
        usage_interval INTEGER,
        usage_unit TEXT,
        next_usage INTEGER,
        auto_renew INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'active',
        provider TEXT,
        notes TEXT,
        details TEXT NOT NULL DEFAULT '{}',
        parent_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT ${NOW},
        updated_at TEXT NOT NULL DEFAULT ${NOW}
      );
      CREATE INDEX idx_items_status_due ON items(status, due_date);
      CREATE INDEX idx_items_parent ON items(parent_id);

      CREATE TABLE price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        amount_cents INTEGER NOT NULL,
        currency TEXT NOT NULL,
        effective_date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT ${NOW}
      );
      CREATE INDEX idx_price_history_item ON price_history(item_id, effective_date);

      CREATE TABLE reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        days_before INTEGER NOT NULL,
        notification_id TEXT,
        scheduled_for TEXT,
        UNIQUE (item_id, days_before)
      );

      CREATE TABLE attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        kind TEXT NOT NULL DEFAULT 'file',
        file_uri TEXT NOT NULL,
        file_name TEXT,
        mime_type TEXT,
        encrypted INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT ${NOW}
      );
      CREATE INDEX idx_attachments_item ON attachments(item_id);

      CREATE TABLE settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  },

  // v2 (V3 maintenance): vehicles and homes, odometer readings, and a log of
  // each time a task was done or a renewal confirmed. Items can belong to a
  // vehicle or home. Tasks were planned as schedule type "usage".
  async (db) => {
    await db.execAsync(`
      CREATE TABLE assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        usage_unit TEXT,
        details TEXT NOT NULL DEFAULT '{}',
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT ${NOW},
        updated_at TEXT NOT NULL DEFAULT ${NOW}
      );

      CREATE TABLE usage_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        reading INTEGER NOT NULL,
        reading_date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT ${NOW}
      );
      CREATE INDEX idx_usage_readings_asset ON usage_readings(asset_id, reading_date);

      CREATE TABLE completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        done_date TEXT NOT NULL,
        amount_cents INTEGER,
        currency TEXT,
        usage_reading INTEGER,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT ${NOW}
      );
      CREATE INDEX idx_completions_item ON completions(item_id, done_date);

      ALTER TABLE items ADD COLUMN asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL;
      CREATE INDEX idx_items_asset ON items(asset_id);
      UPDATE items SET schedule_type = 'task' WHERE schedule_type = 'usage';
    `);
  },
];

export const SCHEMA_VERSION = MIGRATIONS.length;

/** Runs on every app start, before any screen reads the database. */
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  // Foreign keys are off by default in SQLite and must be enabled per connection.
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version > SCHEMA_VERSION) {
    throw new Error(`Database version ${version} is newer than this app (${SCHEMA_VERSION}).`);
  }
  if (version === 0) {
    // Must run outside a transaction.
    await db.execAsync('PRAGMA journal_mode = WAL;');
  }

  while (version < SCHEMA_VERSION) {
    const migrate = MIGRATIONS[version];
    const next = version + 1;
    await db.withTransactionAsync(async () => {
      await migrate(db);
      await db.execAsync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
}
