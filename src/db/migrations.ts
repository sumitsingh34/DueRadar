import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'dueradar.db';

const NOW = `(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

/**
 * Ordered schema migrations. Migration N moves the database from version N to
 * N + 1. Never edit a migration that has shipped; append a new one instead.
 */
const MIGRATIONS: readonly ((db: SQLiteDatabase) => Promise<void>)[] = [
  // v1: core tables for the whole roadmap (V1 subscriptions through V5 documents).
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
