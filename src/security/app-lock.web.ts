/** The app lock needs the phone app; the web version has no screen lock to ask for. */

export const appLockSupported = false;

export async function canUseAppLock(): Promise<boolean> {
  return false;
}

export async function authenticate(_promptMessage: string): Promise<'success' | 'failed' | 'unavailable'> {
  return 'unavailable';
}
