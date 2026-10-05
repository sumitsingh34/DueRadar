import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { deleteCachedFile } from '@/attachments/storage';

/** Web version: files.web.ts. */

/** Names of the files the app writes for sharing, such as "dueradar-backup-2026-10-05.json". */
const EXPORT_PREFIX = 'dueradar-';

/**
 * Deletes temporary copies that can hold private data: files written for
 * sharing earlier, and photos the picker copied but that were never saved.
 * Call at launch, when nothing is using them.
 */
export function clearTemporaryFiles(): void {
  try {
    for (const entry of Paths.cache.list()) {
      if (entry instanceof File && entry.name.startsWith(EXPORT_PREFIX)) entry.delete();
    }
    const picked = new Directory(Paths.cache, 'ImagePicker');
    if (picked.exists) {
      for (const entry of picked.list()) entry.delete();
    }
  } catch (error) {
    console.warn('Could not clear temporary files', error);
  }
}

/**
 * Writes a text file and opens the share sheet so the user can save or send
 * it. The file is left in place for the app it's shared to, and deleted at
 * the next launch or export.
 */
export async function shareTextFile(fileName: string, content: string, mimeType: string): Promise<void> {
  for (const entry of Paths.cache.list()) {
    if (entry instanceof File && entry.name.startsWith(EXPORT_PREFIX)) entry.delete();
  }
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(content);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing isn’t available on this device.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType,
    dialogTitle: 'Save or send your DueRadar file',
    UTI: mimeType === 'application/json' ? 'public.json' : 'public.comma-separated-values-text',
  });
}

/** Lets the user pick a file and returns its text, or null if they cancelled. */
export async function pickTextFile(): Promise<string | null> {
  // Any type: cloud drives often label .json files as generic binary data.
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled) return null;
  const { uri } = result.assets[0];
  try {
    return await new File(uri).text();
  } finally {
    // The copy may hold document photos; it isn't needed once read.
    deleteCachedFile(uri);
  }
}
