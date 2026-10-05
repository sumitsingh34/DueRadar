import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Web version: vault.web.ts. Document photos are encrypted with AES-256-GCM.
 * The key is created on first use and kept in the phone's secure storage
 * (the Android Keystore or iOS Keychain), never in the database or backups.
 */

const KEY_NAME = 'dueradar.vault-key';

/** Thrown for a photo this phone can't decrypt, e.g. one copied from another phone. */
export class VaultKeyError extends Error {
  constructor() {
    super('This photo was saved on another phone and can’t be opened here.');
  }
}

let keyPromise: Promise<AESEncryptionKey> | null = null;

/**
 * The vault key, or null when there is none yet and `create` is false. Calls
 * share one promise, so two photos saved at once can't create two keys.
 */
async function getKey(create: boolean): Promise<AESEncryptionKey | null> {
  if (keyPromise) return keyPromise;
  const stored = await SecureStore.getItemAsync(KEY_NAME);
  if (!stored && !create) return null;
  if (!keyPromise) {
    keyPromise = (stored ? AESEncryptionKey.import(stored, 'base64') : createKey()).catch((error) => {
      keyPromise = null;
      throw error;
    });
  }
  return keyPromise;
}

async function createKey(): Promise<AESEncryptionKey> {
  const key = await AESEncryptionKey.generate();
  await SecureStore.setItemAsync(KEY_NAME, await key.encoded('base64'));
  return key;
}

/** Encrypts base64 data. The result, also base64, holds the nonce, ciphertext and tag. */
export async function encryptBase64(data: string): Promise<string> {
  const key = await getKey(true);
  const sealed = await aesEncryptAsync(data, key!);
  return sealed.combined('base64');
}

/** Decrypts what `encryptBase64` made. Throws VaultKeyError when this phone has the wrong key. */
export async function decryptBase64(data: string): Promise<string> {
  const key = await getKey(false);
  if (!key) throw new VaultKeyError();
  try {
    return await aesDecryptAsync(AESSealedData.fromCombined(data), key, { output: 'base64' });
  } catch {
    throw new VaultKeyError();
  }
}
