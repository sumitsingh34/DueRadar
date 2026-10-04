import type { SQLiteDatabase } from 'expo-sqlite';

import { emitDataChanged } from '@/db/events';
import { listAllPriceHistory, listItems } from '@/db/items';
import { getSettings, writeSettings } from '@/db/settings';
import { createBackup, type Backup } from '@/domain/backup';

export async function exportBackup(db: SQLiteDatabase): Promise<Backup> {
  const [items, priceHistory, settings] = await Promise.all([
    listItems(db),
    listAllPriceHistory(db),
    getSettings(db),
  ]);
  return createBackup(items, priceHistory, settings);
}

/** Replaces all items, price history and settings with the backup's, in one transaction. */
export async function restoreBackup(db: SQLiteDatabase, backup: Backup): Promise<void> {
  await db.withTransactionAsync(async () => {
    // Deleting items also deletes their price history, reminders and attachments.
    await db.execAsync('DELETE FROM items; DELETE FROM settings;');

    // Insert without parent links first, since a parent may come later in the list.
    for (const item of backup.items) {
      await db.runAsync(
        `INSERT INTO items (id, name, category, schedule_type, amount_cents, currency,
          interval_unit, interval_count, start_date, due_date, usage_interval, usage_unit,
          next_usage, auto_renew, status, provider, notes, details, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.id,
        item.name,
        item.category,
        item.scheduleType,
        item.amountCents,
        item.currency,
        item.intervalUnit,
        item.intervalCount,
        item.startDate,
        item.dueDate,
        item.usageInterval,
        item.usageUnit,
        item.nextUsage,
        item.autoRenew ? 1 : 0,
        item.status,
        item.provider,
        item.notes,
        JSON.stringify(item.details),
        item.createdAt,
        item.updatedAt,
      );
    }
    for (const item of backup.items) {
      if (item.parentId != null) {
        await db.runAsync('UPDATE items SET parent_id = ? WHERE id = ?', item.parentId, item.id);
      }
    }

    for (const price of backup.priceHistory) {
      await db.runAsync(
        'INSERT INTO price_history (item_id, amount_cents, currency, effective_date) VALUES (?, ?, ?, ?)',
        price.itemId,
        price.amountCents,
        price.currency,
        price.effectiveDate,
      );
    }

    await writeSettings(db, backup.settings);
  });
  emitDataChanged();
}
