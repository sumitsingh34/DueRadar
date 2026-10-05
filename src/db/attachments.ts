import type { SQLiteDatabase } from 'expo-sqlite';

import {
  deleteAttachmentFile,
  readAttachmentBase64,
  readFileBase64,
  storeAttachmentFile,
  writeAttachmentBase64,
} from '@/attachments/storage';
import { decryptBase64, encryptBase64 } from '@/attachments/vault';
import { emitDataChanged } from '@/db/events';
import type { Attachment } from '@/domain/types';

interface AttachmentRow {
  id: number;
  item_id: number;
  kind: string;
  file_uri: string;
  mime_type: string | null;
  encrypted: number;
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

/** A document photo in the form: one already saved, or one just picked. */
export interface DocumentPhoto {
  /** Stable key for lists. */
  key: string;
  /** What to show: a data URI of the decrypted photo, a picked file's URI, or null if it can't be opened. */
  uri: string | null;
  mimeType: string | null;
  /** Set for photos that are already saved. */
  attachmentId?: number;
}

/** An item's document photos, decrypted for showing. A photo that can't be decrypted has no URI. */
export async function loadDocumentPhotos(db: SQLiteDatabase, itemId: number): Promise<DocumentPhoto[]> {
  const rows = await db.getAllAsync<AttachmentRow>(
    "SELECT * FROM attachments WHERE item_id = ? AND kind = 'document' ORDER BY id",
    itemId,
  );
  return Promise.all(
    rows.map(async (row) => {
      const mimeType = row.mime_type ?? 'image/jpeg';
      let uri: string | null = null;
      try {
        const data = await readDocumentPhoto(toAttachment(row));
        if (data) uri = `data:${mimeType};base64,${data}`;
      } catch (error) {
        console.warn('Could not open a document photo', error);
      }
      return { key: `saved-${row.id}`, uri, mimeType, attachmentId: row.id };
    }),
  );
}

/** A document photo's contents as base64, decrypted. Null when the file is missing. */
export async function readDocumentPhoto(attachment: Attachment): Promise<string | null> {
  const data = await readAttachmentBase64(attachment.path);
  if (data == null) return null;
  return attachment.encrypted ? decryptBase64(data) : data;
}

/**
 * Saves an item's document photos as shown in the form: new photos are
 * encrypted into the vault, and removed ones are deleted with their files.
 */
export async function saveDocumentPhotos(
  db: SQLiteDatabase,
  itemId: number,
  photos: readonly DocumentPhoto[],
): Promise<void> {
  const rows = await db.getAllAsync<Pick<AttachmentRow, 'id' | 'file_uri'>>(
    "SELECT id, file_uri FROM attachments WHERE item_id = ? AND kind = 'document'",
    itemId,
  );
  const kept = new Set(photos.map((p) => p.attachmentId).filter((id) => id != null));
  const removed = rows.filter((row) => !kept.has(row.id));

  // Encrypt and write new photos first, so a failure leaves the saved ones as they were.
  const added: { path: string; mimeType: string }[] = [];
  for (const [index, photo] of photos.entries()) {
    if (photo.attachmentId != null || !photo.uri) continue;
    const encrypted = await encryptBase64(await readFileBase64(photo.uri));
    const fileName = `${itemId}-${Date.now()}-${index}.enc`;
    added.push({ path: writeAttachmentBase64(fileName, encrypted, 'vault'), mimeType: photo.mimeType ?? 'image/jpeg' });
  }

  await db.withTransactionAsync(async () => {
    for (const row of removed) await db.runAsync('DELETE FROM attachments WHERE id = ?', row.id);
    for (const file of added) {
      await db.runAsync(
        "INSERT INTO attachments (item_id, kind, file_uri, file_name, mime_type, encrypted) VALUES (?, 'document', ?, ?, ?, 1)",
        itemId,
        file.path,
        file.path.split('/').pop() ?? file.path,
        file.mimeType,
      );
    }
  });
  for (const row of removed) deleteAttachmentFile(row.file_uri);
  emitDataChanged();
}

function toAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    itemId: row.item_id,
    kind: row.kind === 'document' ? 'document' : 'receipt',
    path: row.file_uri,
    mimeType: row.mime_type,
    encrypted: row.encrypted === 1,
    createdAt: row.created_at,
  };
}
