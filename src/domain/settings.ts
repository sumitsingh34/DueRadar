import { DEFAULT_CURRENCY } from './money';

export interface AppSettings {
  /** Currency for new items (ISO 4217 code). */
  currency: string;
  remindersEnabled: boolean;
  /** Days before a due date to send a reminder, largest first. 0 means on the day. */
  reminderDays: number[];
  /** Local hour of day (0–23) reminders are delivered. */
  reminderHour: number;
  /** Whether opening the app asks for the fingerprint, face or phone PIN. */
  appLock: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  currency: DEFAULT_CURRENCY,
  remindersEnabled: true,
  reminderDays: [30, 7, 1],
  reminderHour: 9,
  appLock: false,
};

export const REMINDER_DAY_OPTIONS = [30, 14, 7, 3, 1, 0] as const;
/** Choices for a single item's reminders, which can be further ahead, e.g. for a passport. */
export const ITEM_REMINDER_DAY_OPTIONS = [180, 90, 60, 30, 14, 7, 3, 1, 0] as const;
export const REMINDER_HOUR_OPTIONS = [8, 9, 12, 18, 20] as const;
export const CURRENCY_OPTIONS = [
  'USD',
  'EUR',
  'GBP',
  'INR',
  'CAD',
  'AUD',
  'JPY',
  'SGD',
  'AED',
  'CHF',
] as const;

/** Builds valid settings from untrusted values (stored rows or a backup file). */
export function normalizeSettings(raw: Record<string, unknown>): AppSettings {
  const { currency, remindersEnabled, reminderDays, reminderHour, appLock } = raw;
  return {
    currency:
      typeof currency === 'string' && /^[A-Z]{3}$/.test(currency)
        ? currency
        : DEFAULT_SETTINGS.currency,
    remindersEnabled:
      typeof remindersEnabled === 'boolean' ? remindersEnabled : DEFAULT_SETTINGS.remindersEnabled,
    reminderDays: normalizeReminderDays(reminderDays) ?? DEFAULT_SETTINGS.reminderDays,
    reminderHour:
      Number.isInteger(reminderHour) && (reminderHour as number) >= 0 && (reminderHour as number) <= 23
        ? (reminderHour as number)
        : DEFAULT_SETTINGS.reminderHour,
    appLock: appLock === true,
  };
}

/** Settings are stored as one row per key with a JSON value. */
export function settingsFromRows(rows: readonly { key: string; value: string }[]): AppSettings {
  const raw: Record<string, unknown> = {};
  for (const { key, value } of rows) {
    try {
      raw[key] = JSON.parse(value);
    } catch {
      // Ignore a corrupt value; the default applies.
    }
  }
  return normalizeSettings(raw);
}

/** "9 AM", "12 PM", "6 PM". */
export function formatHour(hour: number): string {
  const suffix = hour < 12 ? 'AM' : 'PM';
  return `${hour % 12 === 0 ? 12 : hour % 12} ${suffix}`;
}

/** "6 months", "30 days", "1 day" or "On the day": how long before a date a reminder comes. */
export function reminderDayLabel(days: number): string {
  if (days === 0) return 'On the day';
  if (days === 180) return '6 months';
  if (days === 90) return '3 months';
  return days === 1 ? '1 day' : `${days} days`;
}

/** "30 days, 7 days and 1 day before", "1 day before and on the day", or "No reminders". */
export function describeReminderDays(days: readonly number[]): string {
  if (days.length === 0) return 'No reminders';
  const before = days.filter((d) => d > 0).map((d) => reminderDayLabel(d));
  const list =
    before.length > 1 ? `${before.slice(0, -1).join(', ')} and ${before[before.length - 1]}` : before[0];
  if (!days.includes(0)) return `${list} before`;
  return list ? `${list} before and on the day` : 'On the day';
}

/** Valid, de-duplicated reminder days, largest first, from untrusted values; null when not a list. */
export function normalizeReminderDays(raw: unknown): number[] | null {
  if (!Array.isArray(raw)) return null;
  return [...new Set(raw.filter(isDayOffset))].sort((a, b) => b - a);
}

function isDayOffset(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 366;
}
