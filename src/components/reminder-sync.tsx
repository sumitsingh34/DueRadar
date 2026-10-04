import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { onDataChanged } from '@/db/events';
import { syncReminders, useReminderTapNavigation } from '@/notifications/reminders';

const SYNC_DELAY_MS = 400;

/**
 * Keeps scheduled reminders in step with the data: on launch, whenever the
 * app returns to the foreground, and shortly after any change.
 */
export function ReminderSync() {
  const db = useSQLiteContext();
  useReminderTapNavigation();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleSync = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        syncReminders(db).catch((error) => console.warn('Could not schedule reminders', error));
      }, SYNC_DELAY_MS);
    };

    scheduleSync();
    const unsubscribe = onDataChanged(scheduleSync);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') scheduleSync();
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
      appState.remove();
    };
  }, [db]);

  return null;
}
