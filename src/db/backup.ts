import type { SQLiteDatabase } from 'expo-sqlite';

import {
  attachmentsSupported,
  deleteUnreferencedAttachmentFiles,
  readAttachmentBase64,
  writeAttachmentBase64,
} from '@/attachments/storage';
import { listAttachments } from '@/db/attachments';
import { emitDataChanged } from '@/db/events';
import { listAllPriceHistory, listItems } from '@/db/items';
import { getSettings, writeSettings } from '@/db/settings';
import { createBackup, type Backup, type BackupAttachment } from '@/domain/backup';

/** Everything, including receipt photos as base64. */
export async function exportBackup(db: SQLiteDatabase): Promise<Backup> {
  const [items, priceHistory, settings, attachments] = await Promise.all([
    listItems(db),
    listAllPriceHistory(db),
    getSettings(db),
    listAttachments(db),
  ]);

  const files: BackupAttachment[] = [];
  for (const attachment of attachments) {
    const data = await readAttachmentBase64(attachment.path);
    if (data === null) continue; // The file is missing; nothing to back up.
    files.push({
      itemId: attachment.itemId,
      kind: attachment.kind,
      fileName: attachment.path.split('/').pop() ?? attachment.path,
      mimeType: attachment.mimeType,
      createdAt: attachment.createdAt,
      data,
    });
  }
  return createBackup(items, priceHistory, settings, files);
}

/**
 * Replaces all items, price history, receipts and settings with the backup's.
 * Receipt files are written first, the data is swapped in one transaction,
 * and only then are old receipt files removed, so a failure loses nothing.
 */
export async function restoreBackup(db: SQLiteDatabase, backup: Backup): Promise<void> {
  const receipts = attachmentsSupported
    ? backup.attachments.map((a) => ({ ...a, path: writeAttachmentBase64(a.fileName, a.data) }))
    : [];

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

    for (const receipt of receipts) {
      await db.runAsync(
        'INSERT INTO attachments (item_id, kind, file_uri, file_name, mime_type, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        receipt.itemId,
        receipt.kind,
        receipt.path,
        receipt.fileName,
        receipt.mimeType,
        receipt.createdAt,
      );
    }

    await writeSettings(db, backup.settings);
  });
  deleteUnreferencedAttachmentFiles(new Set(receipts.map((r) => r.path)));
  emitDataChanged();
}
