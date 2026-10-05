/** Document photos need the phone app, which keeps the vault key in secure storage. */

export class VaultKeyError extends Error {
  constructor() {
    super('This photo was saved on another phone and can’t be opened here.');
  }
}

export async function encryptBase64(_data: string): Promise<string> {
  throw new Error('Document photos are only available in the phone app.');
}

export async function decryptBase64(_data: string): Promise<string> {
  throw new Error('Document photos are only available in the phone app.');
}
