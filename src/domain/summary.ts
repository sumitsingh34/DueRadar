import { CATEGORIES, getCategory, recurringWording, type Category, type CategoryId } from './categories';
import { daysBetween, formatDate, formatShortDate, formatTime, nextOccurrenceOnOrAfter } from './dates';
import { monthlyEquivalentCents } from './money';
import type { Item } from './types';
import { distanceDue, formatDistance, type DistanceDue, type UsageMap } from './usage';

export interface DueItem {
  item: Item;
  /**
   * When it's next due: the renewal, task or expiry date, or for a vehicle
   * task, the day its distance is reached if that comes first.
   */
  dueDate: string;
  /** Days from today to `dueDate`. Negative once it has passed. */
  daysUntil: number;
  /** Past its date or, for a vehicle task, past its distance. */
  overdue: boolean;
  /** A one-time date that's simply over, like an appointment. Never overdue. */
  past: boolean;
  /** A vehicle task's distance status, when the vehicle has a reading. */
  distance: DistanceDue | null;
  /** Whether `dueDate` is an estimate from the vehicle's average daily distance. */
  estimated: boolean;
  /** Days to the date on the item's schedule. Equals `daysUntil` unless estimated. */
  scheduledDays: number;
}

export interface CurrencyTotal {
  currency: string;
  monthlyCents: number;
}

export interface DashboardSummary {
  /** Sorted by amount, largest first. */
  totals: CurrencyTotal[];
  activeCount: number;
  /** Due within the window, soonest first. */
  upcoming: DueItem[];
  /** Expired, or past a renewal date that does not renew automatically, or a task that's overdue. */
  needsAttention: DueItem[];
}

/**
 * The scheduled date that matters next. Auto-renewing items roll forward on
 * their own. Everything else keeps its date so a passed date shows as overdue.
 */
export function nextDueDate(item: Item, today: string): string | null {
  if (!item.dueDate) return null;
  if (item.scheduleType === 'recurring' && item.autoRenew && hasInterval(item)) {
    return nextOccurrenceOnOrAfter(item.dueDate, item.intervalUnit, item.intervalCount, today);
  }
  return item.dueDate;
}

/**
 * The item's next due date and status. A vehicle task is due at its date or
 * its distance, whichever comes first. A date estimated from the average daily
 * distance can move it earlier, but only real data makes it overdue: a passed
 * date, or an odometer reading at or past the target.
 */
export function toDueItem(item: Item, today: string, usage?: UsageMap): DueItem | null {
  const scheduled = nextDueDate(item, today);
  if (!scheduled) return null;
  const scheduledDays = daysBetween(today, scheduled);
  const distance = item.assetId != null ? distanceDue(item, usage?.get(item.assetId)) : null;

  let dueDate = scheduled;
  let estimated = false;
  if (distance?.date && distance.date < scheduled) {
    dueDate = distance.date;
    estimated = distance.left > 0;
  }
  const past =
    scheduledDays < 0 && item.scheduleType === 'expiry' && getCategory(item.category).pastIsDone === true;
  return {
    item,
    dueDate,
    daysUntil: daysBetween(today, dueDate),
    overdue: !past && (scheduledDays < 0 || (distance != null && distance.left <= 0)),
    past,
    distance,
    estimated,
    scheduledDays,
  };
}

/**
 * Short human label, e.g. "Renews in 5 days", "Renews in 12 months",
 * "Expired 2 days ago", "Warranty ends in 11 months", or for a vehicle task,
 * "Due in 3 months or 1,200 km".
 */
export function dueLabel(due: DueItem): string {
  const { item } = due;
  if (item.scheduleType === 'task') return taskLabel(due);

  const daysUntil = due.scheduledDays;
  const category = getCategory(item.category);
  const wording = category.wording;
  const verb =
    item.scheduleType === 'expiry' ? (wording?.expires ?? 'Expires') : recurringWording(category).verb;
  if (daysUntil === 0) return phrase(verb, 'today');
  if (daysUntil === 1) return phrase(verb, 'tomorrow');
  if (daysUntil > 1) return phrase(verb, `in ${describeDays(daysUntil)}`);
  const ago = -daysUntil;
  if (item.scheduleType === 'expiry') {
    const past = wording?.expired ?? 'Expired';
    return phrase(past, ago === 1 ? 'yesterday' : `${describeDays(ago)} ago`);
  }
  return `Overdue by ${describeDays(ago)}`;
}

/**
 * The due date for a list, e.g. "Nov 4", "Nov 4, 10:30 AM" for an
 * appointment, or "≈ Nov 4" when estimated from distance.
 */
export function shortDueDate(due: DueItem, today: string): string {
  return `${due.estimated ? '≈ ' : ''}${formatShortDate(due.dueDate, today)}${timeSuffix(due)}`;
}

/** The due date in full, e.g. "Nov 4, 2026" or "Nov 4, 2026, 10:30 AM". */
export function fullDueDate(due: DueItem): string {
  return `${due.estimated ? 'around ' : ''}${formatDate(due.dueDate)}${timeSuffix(due)}`;
}

function timeSuffix({ item, dueDate }: DueItem): string {
  return item.dueTime && dueDate === item.dueDate ? `, ${formatTime(item.dueTime)}` : '';
}

/** "Renews in 5 days", or without a verb, as for an appointment, "In 5 days". */
function phrase(verb: string, rest: string): string {
  return verb ? `${verb} ${rest}` : rest.charAt(0).toUpperCase() + rest.slice(1);
}

function taskLabel({ distance, scheduledDays }: DueItem): string {
  if (distance && distance.left <= 0) {
    return distance.left === 0 ? 'Due now' : `Overdue by ${formatDistance(-distance.left, distance.unit)}`;
  }
  if (scheduledDays < 0) return `Overdue by ${describeDays(-scheduledDays)}`;
  if (scheduledDays === 0) return 'Due today';
  if (scheduledDays === 1) return 'Due tomorrow';
  const time = `Due in ${describeDays(scheduledDays)}`;
  return distance ? `${time} or ${formatDistance(distance.left, distance.unit)}` : time;
}

/** "5 days" up to two months, then "3 months", then "2 years" from two years. */
export function describeDays(days: number): string {
  if (days >= 730) return plural(Math.round(days / 365.25), 'year');
  if (days > 60) return plural(Math.round(days / 30.44), 'month');
  return plural(days, 'day');
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}

export function buildDashboard(
  items: Item[],
  today: string,
  windowDays = 30,
  usage?: UsageMap,
): DashboardSummary {
  const active = items.filter((item) => item.status === 'active');

  const due = active
    .map((item) => toDueItem(item, today, usage))
    .filter((d): d is DueItem => d !== null)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return {
    totals: monthlyTotals(active),
    activeCount: active.length,
    upcoming: due.filter((d) => !d.overdue && !d.past && d.daysUntil <= windowDays),
    needsAttention: due.filter((d) => d.overdue),
  };
}

/** What the active items that repeat cost a month, per currency, largest first. */
export function monthlyTotals(items: readonly Item[]): CurrencyTotal[] {
  const totals = new Map<string, number>();
  for (const item of items) {
    if (item.status !== 'active' || !hasInterval(item) || item.amountCents == null) continue;
    const monthly = monthlyEquivalentCents(item.amountCents, item.intervalUnit, item.intervalCount);
    totals.set(item.currency, (totals.get(item.currency) ?? 0) + monthly);
  }
  return [...totals]
    .map(([currency, monthlyCents]) => ({ currency, monthlyCents }))
    .sort((a, b) => b.monthlyCents - a.monthlyCents);
}

/** The monthly total in one currency, or 0 when there is none. */
export function totalIn(totals: readonly CurrencyTotal[], currency: string): number {
  return totals.find((total) => total.currency === currency)?.monthlyCents ?? 0;
}

export interface CategoryCosts {
  category: Category;
  /** How many items it has, whatever their status. */
  itemCount: number;
  /** What its active items that repeat cost a month, per currency, largest first. */
  totals: CurrencyTotal[];
}

/**
 * Every category that has items, with what it costs a month: the largest
 * cost in `currency` (the main one) first, then costs only in other
 * currencies, then the categories with no recurring cost, each in the usual
 * category order.
 */
export function costsByCategory(items: readonly Item[], currency: string): CategoryCosts[] {
  const byCategory = new Map<CategoryId, Item[]>();
  for (const item of items) {
    // Unknown categories count as Other, as everywhere else.
    const id = getCategory(item.category).id;
    byCategory.set(id, [...(byCategory.get(id) ?? []), item]);
  }
  return CATEGORIES.filter((category) => byCategory.has(category.id))
    .map((category) => {
      const list = byCategory.get(category.id)!;
      return { category, itemCount: list.length, totals: monthlyTotals(list) };
    })
    .sort(
      (a, b) =>
        totalIn(b.totals, currency) - totalIn(a.totals, currency) ||
        Number(b.totals.length > 0) - Number(a.totals.length > 0),
    );
}

/** An item in a list, with when it's next due. */
export interface ListedItem {
  item: Item;
  due: DueItem | null;
}

export interface ItemSection {
  key: 'active' | 'past' | 'inactive';
  label: string;
  rows: ListedItem[];
}

/**
 * Items the way lists show them: active ones soonest first, then
 * appointments that are over, most recent first, then paused or cancelled
 * ones. Empty sections are left out.
 */
export function itemSections(items: readonly Item[], today: string, usage?: UsageMap): ItemSection[] {
  const rows = items.map((item) => ({ item, due: toDueItem(item, today, usage) }));
  const active = rows.filter((r) => r.item.status === 'active');
  const sections: ItemSection[] = [
    {
      key: 'active',
      label: 'Active',
      rows: active
        .filter((r) => !r.due?.past)
        .sort((a, b) => (a.due?.daysUntil ?? Infinity) - (b.due?.daysUntil ?? Infinity)),
    },
    // Appointments that are over, most recent first.
    {
      key: 'past',
      label: 'Past',
      rows: active.filter((r) => r.due?.past).sort((a, b) => b.due!.daysUntil - a.due!.daysUntil),
    },
    { key: 'inactive', label: 'Paused or cancelled', rows: rows.filter((r) => r.item.status !== 'active') },
  ];
  return sections.filter((section) => section.rows.length > 0);
}

/** Whether the item repeats every interval (a renewal or a task). */
export function hasInterval(
  item: Item,
): item is Item & { intervalUnit: NonNullable<Item['intervalUnit']>; intervalCount: number } {
  return item.scheduleType !== 'expiry' && item.intervalUnit != null && item.intervalCount != null;
}
