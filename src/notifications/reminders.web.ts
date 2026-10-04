import type { SQLiteDatabase } from 'expo-sqlite';

/** Reminders need the phone app; on the web these do nothing. */

export type ReminderPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export function configureNotifications(): void {}

export async function getReminderPermission(): Promise<ReminderPermission> {
  return 'unsupported';
}

export async function requestReminderPermission(): Promise<ReminderPermission> {
  return 'unsupported';
}

export async function syncReminders(_db: SQLiteDatabase): Promise<number> {
  return 0;
}

export function useReminderTapNavigation(): void {}
