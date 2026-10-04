import type { SQLiteDatabase } from 'expo-sqlite';

import { emitDataChanged } from '@/db/events';
import { settingsFromRows, type AppSettings } from '@/domain/settings';

export async function getSettings(db: SQLiteDatabase): Promise<AppSettings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  return settingsFromRows(rows);
}

export async function updateSettings(db: SQLiteDatabase, patch: Partial<AppSettings>): Promise<void> {
  await db.withTransactionAsync(async () => {
    await writeSettings(db, patch);
  });
  emitDataChanged();
}

/** Stores each setting as its own row with a JSON value. Runs inside the caller's transaction. */
export async function writeSettings(db: SQLiteDatabase, patch: Partial<AppSettings>): Promise<void> {
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    await db.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      key,
      JSON.stringify(value),
    );
  }
}
