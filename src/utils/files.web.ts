import * as DocumentPicker from 'expo-document-picker';

/** The browser keeps no temporary files for the app. */
export function clearTemporaryFiles(): void {}

/** Downloads the file in the browser. */
export async function shareTextFile(fileName: string, content: string, mimeType: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Lets the user pick a file and returns its text, or null if they cancelled. */
export async function pickTextFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/json,.json' });
  if (result.canceled) return null;
  const asset = result.assets[0];
  return asset.file ? asset.file.text() : (await fetch(asset.uri)).text();
}
