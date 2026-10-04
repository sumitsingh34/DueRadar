import { DEFAULT_CURRENCY } from './money';

export interface AppSettings {
  /** Currency for new items (ISO 4217 code). */
  currency: string;
  remindersEnabled: boolean;
  /** Days before a due date to send a reminder, largest first. 0 means on the day. */
  reminderDays: number[];
  /** Local hour of day (0–23) reminders are delivered. */
  reminderHour: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  currency: DEFAULT_CURRENCY,
  remindersEnabled: true,
  reminderDays: [30, 7, 1],
  reminderHour: 9,
};

export const REMINDER_DAY_OPTIONS = [30, 14, 7, 3, 1, 0] as const;
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
  const { currency, remindersEnabled, reminderDays, reminderHour } = raw;
  return {
    currency:
      typeof currency === 'string' && /^[A-Z]{3}$/.test(currency)
        ? currency
        : DEFAULT_SETTINGS.currency,
    remindersEnabled:
      typeof remindersEnabled === 'boolean' ? remindersEnabled : DEFAULT_SETTINGS.remindersEnabled,
    reminderDays: Array.isArray(reminderDays)
      ? [...new Set(reminderDays.filter(isDayOffset))].sort((a, b) => b - a)
      : DEFAULT_SETTINGS.reminderDays,
    reminderHour:
      Number.isInteger(reminderHour) && (reminderHour as number) >= 0 && (reminderHour as number) <= 23
        ? (reminderHour as number)
        : DEFAULT_SETTINGS.reminderHour,
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

function isDayOffset(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 366;
}
