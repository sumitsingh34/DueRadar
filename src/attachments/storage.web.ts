/** Receipt and document photos need the phone app; the web version has no file storage. */

export const attachmentsSupported = false;

export type PhotoFolder = 'receipts' | 'vault';

export function attachmentUri(path: string): string {
  return path;
}

export async function storeAttachmentFile(_sourceUri: string, _fileName: string): Promise<string> {
  throw new Error('Photos are only available in the phone app.');
}

export function deleteAttachmentFile(_path: string): void {}

export async function readAttachmentBase64(_path: string): Promise<string | null> {
  return null;
}

export async function readFileBase64(_uri: string): Promise<string> {
  throw new Error('Photos are only available in the phone app.');
}

export function writeAttachmentBase64(_fileName: string, _data: string, _folder?: PhotoFolder): string {
  throw new Error('Photos are only available in the phone app.');
}

export function deleteUnreferencedAttachmentFiles(_keep: ReadonlySet<string>): void {}
