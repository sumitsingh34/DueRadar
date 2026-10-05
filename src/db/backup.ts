import type { SQLiteDatabase } from 'expo-sqlite';

import {
  attachmentsSupported,
  deleteUnreferencedAttachmentFiles,
  readAttachmentBase64,
  writeAttachmentBase64,
} from '@/attachments/storage';
import { encryptBase64 } from '@/attachments/vault';
import { listAssets, listReadings } from '@/db/assets';
import { listAttachments, readDocumentPhoto } from '@/db/attachments';
import { emitDataChanged } from '@/db/events';
import { listAllCompletions, listAllPriceHistory, listItems } from '@/db/items';
import { getSettings, writeSettings } from '@/db/settings';
import { createBackup, type Backup, type BackupAttachment } from '@/domain/backup';

/** How many document photos there are, to ask whether a backup should include them. */
export async function countDocumentPhotos(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM attachments WHERE kind = 'document'",
  );
  return row?.count ?? 0;
}

/**
 * Everything, including receipt photos as base64, and document photos too if
 * asked for. Those are decrypted, since the vault key stays on this phone.
 * Photos that can't be read or decrypted are left out.
 */
export async function exportBackup(
  db: SQLiteDatabase,
  { includeDocuments }: { includeDocuments: boolean },
): Promise<Backup> {
  const [items, priceHistory, settings, attachments, assets, readings, completions] = await Promise.all([
    listItems(db),
    listAllPriceHistory(db),
    getSettings(db),
    listAttachments(db),
    listAssets(db),
    listReadings(db),
    listAllCompletions(db),
  ]);

  const files: BackupAttachment[] = [];
  for (const attachment of attachments) {
    if (attachment.kind === 'document' && !includeDocuments) continue;
    let data: string | null = null;
    try {
      data =
        attachment.kind === 'document'
          ? await readDocumentPhoto(attachment)
          : await readAttachmentBase64(attachment.path);
    } catch (error) {
      console.warn('Left a photo out of the backup', error);
    }
    if (data === null) continue; // The file is missing or can't be opened.
    files.push({
      itemId: attachment.itemId,
      kind: attachment.kind,
      fileName: attachment.path.split('/').pop() ?? attachment.path,
      mimeType: attachment.mimeType,
      createdAt: attachment.createdAt,
      data,
    });
  }
  return createBackup({
    settings,
    items,
    priceHistory,
    attachments: files,
    assets,
    usageReadings: readings.map(({ assetId, reading, date }) => ({ assetId, reading, date })),
    completions,
  });
}

/**
 * Replaces all data and settings with the backup's. Photo files are written
 * first (document photos encrypted with this phone's key), the data is
 * swapped in one transaction, and only then are old photo files removed, so a
 * failure loses nothing.
 */
export async function restoreBackup(db: SQLiteDatabase, backup: Backup): Promise<void> {
  const photos: (BackupAttachment & { path: string; encrypted: boolean })[] = [];
  if (attachmentsSupported) {
    for (const file of backup.attachments) {
      photos.push(
        file.kind === 'document'
          ? { ...file, encrypted: true, path: writeAttachmentBase64(file.fileName, await encryptBase64(file.data), 'vault') }
          : { ...file, encrypted: false, path: writeAttachmentBase64(file.fileName, file.data) },
      );
    }
  }

  await db.withTransactionAsync(async () => {
    // Deleting items also deletes their price history, history and attachments,
    // and deleting vehicles and homes deletes their odometer readings.
    await db.execAsync('DELETE FROM items; DELETE FROM assets; DELETE FROM settings;');

    for (const asset of backup.assets) {
      await db.runAsync(
        `INSERT INTO assets (id, name, kind, usage_unit, details, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        asset.id,
        asset.name,
        asset.kind,
        asset.usageUnit,
        JSON.stringify(asset.details),
        asset.notes,
        asset.createdAt,
        asset.updatedAt,
      );
    }
    for (const reading of backup.usageReadings) {
      await db.runAsync(
        'INSERT INTO usage_readings (asset_id, reading, reading_date) VALUES (?, ?, ?)',
        reading.assetId,
        reading.reading,
        reading.date,
      );
    }

    // Insert without parent links first, since a parent may come later in the list.
    for (const item of backup.items) {
      await db.runAsync(
        `INSERT INTO items (id, name, category, schedule_type, amount_cents, currency,
          interval_unit, interval_count, start_date, due_date, due_time, reminder_days,
          usage_interval, usage_unit, next_usage, auto_renew, status, provider, notes, details,
          asset_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        item.dueTime,
        item.reminderDays ? JSON.stringify(item.reminderDays) : null,
        item.usageInterval,
        item.usageUnit,
        item.nextUsage,
        item.autoRenew ? 1 : 0,
        item.status,
        item.provider,
        item.notes,
        JSON.stringify(item.details),
        item.assetId,
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

    for (const done of backup.completions) {
      await db.runAsync(
        'INSERT INTO completions (item_id, done_date, amount_cents, currency, usage_reading, note) VALUES (?, ?, ?, ?, ?, ?)',
        done.itemId,
        done.date,
        done.amountCents,
        done.currency,
        done.usage,
        done.note,
      );
    }

    for (const photo of photos) {
      await db.runAsync(
        'INSERT INTO attachments (item_id, kind, file_uri, file_name, mime_type, encrypted, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        photo.itemId,
        photo.kind,
        photo.path,
        photo.fileName,
        photo.mimeType,
        photo.encrypted ? 1 : 0,
        photo.createdAt,
      );
    }

    await writeSettings(db, backup.settings);
  });
  deleteUnreferencedAttachmentFiles(new Set(photos.map((p) => p.path)));
  emitDataChanged();
}
