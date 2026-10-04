import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { listItems } from '@/db/items';
import { getSettings } from '@/db/settings';
import { planReminders } from '@/domain/reminders';

/** Web version: reminders.web.ts. */

export type ReminderPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

const CHANNEL_ID = 'reminders';

/** Shows reminders as banners even while the app is open. Call once at startup. */
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function getReminderPermission(): Promise<ReminderPermission> {
  return toPermission(await Notifications.getPermissionsAsync());
}

export async function requestReminderPermission(): Promise<ReminderPermission> {
  // Android 13+ only shows the permission prompt once a channel exists.
  await ensureChannel();
  return toPermission(await Notifications.requestPermissionsAsync());
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Replaces every scheduled reminder with a fresh plan. Calls run one at a time
 * so two quick saves can't interleave and leave duplicates.
 */
export function syncReminders(db: SQLiteDatabase): Promise<number> {
  const run = queue.then(() => replaceScheduled(db));
  queue = run.catch(() => undefined);
  return run;
}

async function replaceScheduled(db: SQLiteDatabase): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const [settings, permission] = await Promise.all([getSettings(db), Notifications.getPermissionsAsync()]);
  if (!settings.remindersEnabled || !permission.granted) return 0;

  await ensureChannel();
  const planned = planReminders(await listItems(db), settings, new Date());
  for (const reminder of planned) {
    await Notifications.scheduleNotificationAsync({
      content: { title: reminder.title, body: reminder.body, data: { itemId: reminder.itemId } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.fireAt,
        channelId: CHANNEL_ID,
      },
    });
  }
  return planned.length;
}

const handledResponses = new Set<string>();

/** Opens the item when the user taps one of its reminders. */
export function useReminderTapNavigation(): void {
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const key = response.notification.request.identifier;
      const itemId = response.notification.request.content.data?.itemId;
      if (handledResponses.has(key) || typeof itemId !== 'number') return;
      handledResponses.add(key);
      router.push({ pathname: '/item/[id]', params: { id: String(itemId) } });
    };

    // The tap that launched the app, then any taps while it runs.
    open(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Renewal reminders',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

function toPermission(status: Notifications.NotificationPermissionsStatus): ReminderPermission {
  if (status.granted) return 'granted';
  return status.canAskAgain ? 'undetermined' : 'denied';
}
