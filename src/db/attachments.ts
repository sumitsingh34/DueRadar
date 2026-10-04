import type { SQLiteDatabase } from 'expo-sqlite';

import { deleteAttachmentFile, storeAttachmentFile } from '@/attachments/storage';
import { emitDataChanged } from '@/db/events';
import type { Attachment } from '@/domain/types';

interface AttachmentRow {
  id: number;
  item_id: number;
  kind: string;
  file_uri: string;
  mime_type: string | null;
  created_at: string;
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

export async function getReceipt(db: SQLiteDatabase, itemId: number): Promise<Attachment | null> {
  const row = await db.getFirstAsync<AttachmentRow>(
    "SELECT * FROM attachments WHERE item_id = ? AND kind = 'receipt' ORDER BY id DESC LIMIT 1",
    itemId,
  );
  return row ? toAttachment(row) : null;
}

export async function listAttachments(db: SQLiteDatabase): Promise<Attachment[]> {
  const rows = await db.getAllAsync<AttachmentRow>('SELECT * FROM attachments ORDER BY item_id, id');
  return rows.map(toAttachment);
}

/** Stored file paths of an item's attachments, so the files can be removed with it. */
export async function attachmentPaths(db: SQLiteDatabase, itemId: number): Promise<string[]> {
  const rows = await db.getAllAsync<Pick<AttachmentRow, 'file_uri'>>(
    'SELECT file_uri FROM attachments WHERE item_id = ?',
    itemId,
  );
  return rows.map((row) => row.file_uri);
}

/**
 * Replaces an item's receipt with a copy of a picked photo, or removes it
 * when `photo` is null. The old file is deleted once the change is saved.
 */
export async function setReceipt(
  db: SQLiteDatabase,
  itemId: number,
  photo: { uri: string; mimeType: string | null } | null,
): Promise<void> {
  const oldPaths = (
    await db.getAllAsync<Pick<AttachmentRow, 'file_uri'>>(
      "SELECT file_uri FROM attachments WHERE item_id = ? AND kind = 'receipt'",
      itemId,
    )
  ).map((row) => row.file_uri);

  let newPath: string | null = null;
  const mimeType = photo?.mimeType ?? 'image/jpeg';
  if (photo) {
    const extension = EXTENSIONS[mimeType] ?? 'jpg';
    newPath = await storeAttachmentFile(photo.uri, `${itemId}-${Date.now()}.${extension}`);
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM attachments WHERE item_id = ? AND kind = 'receipt'", itemId);
    if (newPath) {
      await db.runAsync(
        "INSERT INTO attachments (item_id, kind, file_uri, file_name, mime_type) VALUES (?, 'receipt', ?, ?, ?)",
        itemId,
        newPath,
        newPath.split('/').pop() ?? newPath,
        mimeType,
      );
    }
  });
  for (const path of oldPaths) deleteAttachmentFile(path);
  emitDataChanged();
}

function toAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    itemId: row.item_id,
    kind: 'receipt',
    path: row.file_uri,
    mimeType: row.mime_type,
    createdAt: row.created_at,
  };
}
