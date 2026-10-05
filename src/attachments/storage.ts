import { Directory, File, Paths } from 'expo-file-system';

/**
 * Web version: storage.web.ts. Photos live in the app's private documents
 * folder: receipts as they are, and document photos encrypted in the vault.
 */

export const attachmentsSupported = true;

export type PhotoFolder = 'receipts' | 'vault';

const FOLDERS: readonly PhotoFolder[] = ['receipts', 'vault'];

function photoFolder(name: PhotoFolder): Directory {
  const folder = new Directory(Paths.document, name);
  if (!folder.exists) folder.create({ intermediates: true });
  return folder;
}

/** A path stored in the database, e.g. "receipts/12-1730000000000.jpg", turned into a file URI. */
export function attachmentUri(path: string): string {
  return new File(Paths.document, path).uri;
}

/** Copies a picked photo into the receipts folder and returns its stored path. */
export async function storeAttachmentFile(sourceUri: string, fileName: string): Promise<string> {
  const target = new File(photoFolder('receipts'), fileName);
  await new File(sourceUri).copy(target, { overwrite: true });
  return `receipts/${fileName}`;
}

export function deleteAttachmentFile(path: string): void {
  const file = new File(Paths.document, path);
  if (file.exists) file.delete();
}

export async function readAttachmentBase64(path: string): Promise<string | null> {
  const file = new File(Paths.document, path);
  return file.exists ? file.base64() : null;
}

/** Reads any file, such as a photo the user just picked, as base64. */
export function readFileBase64(uri: string): Promise<string> {
  return new File(uri).base64();
}

/** Writes a file from base64 data, e.g. from a backup, and returns its stored path. */
export function writeAttachmentBase64(fileName: string, data: string, folder: PhotoFolder = 'receipts'): string {
  const file = new File(photoFolder(folder), fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(data, { encoding: 'base64' });
  return `${folder}/${fileName}`;
}

/** Deletes photos that no attachment refers to any more. */
export function deleteUnreferencedAttachmentFiles(keep: ReadonlySet<string>): void {
  for (const name of FOLDERS) {
    const folder = new Directory(Paths.document, name);
    if (!folder.exists) continue;
    for (const entry of folder.list()) {
      if (entry instanceof File && !keep.has(`${name}/${entry.name}`)) entry.delete();
    }
  }
}
