import * as LocalAuthentication from 'expo-local-authentication';

/** Web version: app-lock.web.ts. */

export const appLockSupported = true;

/** If the phone doesn't answer in this time, act as if it has no screen lock rather than wait. */
const CHECK_TIMEOUT_MS = 5000;

/** Whether the phone has a screen lock (PIN, pattern, password or biometrics) to unlock DueRadar with. */
export async function canUseAppLock(): Promise<boolean> {
  try {
    const level = await Promise.race([
      LocalAuthentication.getEnrolledLevelAsync(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), CHECK_TIMEOUT_MS)),
    ]);
    return level != null && level > LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

/** Asks for the fingerprint, face or phone PIN. Resolves true once the user is confirmed. */
export async function authenticate(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Cancel',
    // Let the phone's PIN, pattern or password work as well as biometrics.
    disableDeviceFallback: false,
  });
  return result.success;
}
