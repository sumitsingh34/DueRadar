/** Receipt photos need the phone app; the web version has no file storage. */

export const attachmentsSupported = false;

export function attachmentUri(path: string): string {
  return path;
}

export async function storeAttachmentFile(_sourceUri: string, _fileName: string): Promise<string> {
  throw new Error('Receipts are only available in the phone app.');
}

export function deleteAttachmentFile(_path: string): void {}

export async function readAttachmentBase64(_path: string): Promise<string | null> {
  return null;
}

export function writeAttachmentBase64(_fileName: string, _data: string): string {
  throw new Error('Receipts are only available in the phone app.');
}

export function deleteUnreferencedAttachmentFiles(_keep: ReadonlySet<string>): void {}
