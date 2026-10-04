import { getCategory } from './categories';
import { addInterval, formatDate, fromISODate, nextOccurrenceOnOrAfter, toISODate } from './dates';
import type { IntervalUnit } from './dates';
import { formatMoney } from './money';
import type { AppSettings } from './settings';
import type { Item } from './types';

export interface PlannedReminder {
  itemId: number;
  /** The renewal or expiry date the reminder is about. */
  dueDate: string;
  daysBefore: number;
  fireAt: Date;
  title: string;
  body: string;
}

/** iOS keeps at most 64 pending notifications per app; stay safely under it. */
export const MAX_SCHEDULED = 60;
/** Schedule this far ahead so reminders keep coming even if the app isn't opened for a while. */
export const HORIZON_DAYS = 400;
const MAX_OCCURRENCES_PER_ITEM = 24;

/** Shortest possible length of one period, used to skip reminders longer than the period. */
const MIN_PERIOD_DAYS: Record<IntervalUnit, number> = { day: 1, week: 7, month: 28, year: 365 };

/**
 * Every reminder to schedule from `now`, soonest first. A reminder is skipped
 * when it is at least as long as the billing period, so a monthly bill never
 * gets a "30 days before" reminder right after its previous renewal.
 */
export function planReminders(
  items: readonly Item[],
  settings: Pick<AppSettings, 'remindersEnabled' | 'reminderDays' | 'reminderHour'>,
  now: Date,
): PlannedReminder[] {
  if (!settings.remindersEnabled || settings.reminderDays.length === 0) return [];

  const today = toISODate(now);
  const horizon = addInterval(today, 'day', HORIZON_DAYS);
  const planned: PlannedReminder[] = [];

  for (const item of items) {
    if (item.status !== 'active') continue;
    for (const dueDate of upcomingDueDates(item, today, horizon)) {
      for (const daysBefore of settings.reminderDays) {
        if (!fitsPeriod(item, daysBefore)) continue;
        const fireAt = fromISODate(addInterval(dueDate, 'day', -daysBefore));
        fireAt.setHours(settings.reminderHour, 0, 0, 0);
        if (fireAt.getTime() <= now.getTime()) continue;
        planned.push({ itemId: item.id, dueDate, daysBefore, fireAt, ...reminderText(item, dueDate, daysBefore) });
      }
    }
  }

  return planned.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()).slice(0, MAX_SCHEDULED);
}

/**
 * Due dates from today up to the horizon. Auto-renewing items repeat. Other
 * items have a single date until the user marks them renewed or edits them.
 */
function upcomingDueDates(item: Item, today: string, horizon: string): string[] {
  const { dueDate, intervalUnit, intervalCount } = item;
  if (!dueDate) return [];
  if (item.scheduleType !== 'recurring' || !item.autoRenew || !intervalUnit || !intervalCount) {
    return dueDate >= today ? [dueDate] : [];
  }

  const dates: string[] = [];
  let next = nextOccurrenceOnOrAfter(dueDate, intervalUnit, intervalCount, today);
  while (next <= horizon && dates.length < MAX_OCCURRENCES_PER_ITEM) {
    dates.push(next);
    next = nextOccurrenceOnOrAfter(dueDate, intervalUnit, intervalCount, addInterval(next, 'day', 1));
  }
  return dates;
}

function fitsPeriod(item: Item, daysBefore: number): boolean {
  if (item.scheduleType !== 'recurring' || !item.intervalUnit || !item.intervalCount) return true;
  return daysBefore < MIN_PERIOD_DAYS[item.intervalUnit] * item.intervalCount;
}

function reminderText(item: Item, dueDate: string, daysBefore: number) {
  const when = daysBefore === 0 ? 'today' : daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`;
  const expires = getCategory(item.category).wording?.expires?.toLowerCase() ?? 'expires';
  const verb = item.scheduleType === 'expiry' ? expires : item.autoRenew ? 'renews' : 'is due';
  const price = item.amountCents != null ? formatMoney(item.amountCents, item.currency) : null;
  return {
    title: `${item.name} ${verb} ${when}`,
    body: [price, formatDate(dueDate)].filter(Boolean).join(' · '),
  };
}
