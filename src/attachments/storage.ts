import { Directory, File, Paths } from 'expo-file-system';

/** Web version: storage.web.ts. Receipt photos live in the app's private documents folder. */

export const attachmentsSupported = true;

const FOLDER = 'receipts';

function receiptsFolder(): Directory {
  const folder = new Directory(Paths.document, FOLDER);
  if (!folder.exists) folder.create({ intermediates: true });
  return folder;
}

/** A path stored in the database, e.g. "receipts/12-1730000000000.jpg", turned into a file URI. */
export function attachmentUri(path: string): string {
  return new File(Paths.document, path).uri;
}

/** Copies a picked photo into the receipts folder and returns its stored path. */
export async function storeAttachmentFile(sourceUri: string, fileName: string): Promise<string> {
  const target = new File(receiptsFolder(), fileName);
  await new File(sourceUri).copy(target, { overwrite: true });
  return `${FOLDER}/${fileName}`;
}

export function deleteAttachmentFile(path: string): void {
  const file = new File(Paths.document, path);
  if (file.exists) file.delete();
}

export async function readAttachmentBase64(path: string): Promise<string | null> {
  const file = new File(Paths.document, path);
  return file.exists ? file.base64() : null;
}

/** Writes a file from a backup and returns its stored path. */
export function writeAttachmentBase64(fileName: string, data: string): string {
  const file = new File(receiptsFolder(), fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(data, { encoding: 'base64' });
  return `${FOLDER}/${fileName}`;
}

/** Deletes files in the receipts folder that no attachment refers to any more. */
export function deleteUnreferencedAttachmentFiles(keep: ReadonlySet<string>): void {
  const folder = new Directory(Paths.document, FOLDER);
  if (!folder.exists) return;
  for (const entry of folder.list()) {
    if (entry instanceof File && !keep.has(`${FOLDER}/${entry.name}`)) entry.delete();
  }
}
