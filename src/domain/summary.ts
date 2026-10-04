import { daysBetween, nextOccurrenceOnOrAfter } from './dates';
import { monthlyEquivalentCents } from './money';
import type { Item } from './types';

export interface DueItem {
  item: Item;
  dueDate: string;
  /** Negative once the date has passed. */
  daysUntil: number;
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
  /** Expired, or past a renewal date that does not renew automatically. */
  needsAttention: DueItem[];
}

/**
 * The next date that matters for an item. Auto-renewing items roll forward on
 * their own. Everything else keeps its date so a passed date shows as overdue.
 */
export function nextDueDate(item: Item, today: string): string | null {
  if (!item.dueDate) return null;
  if (isRecurring(item) && item.autoRenew) {
    return nextOccurrenceOnOrAfter(item.dueDate, item.intervalUnit, item.intervalCount, today);
  }
  return item.dueDate;
}

export function toDueItem(item: Item, today: string): DueItem | null {
  const dueDate = nextDueDate(item, today);
  return dueDate ? { item, dueDate, daysUntil: daysBetween(today, dueDate) } : null;
}

/** Short human label, e.g. "Renews in 5 days" or "Expired 2 days ago". */
export function dueLabel({ item, daysUntil }: DueItem): string {
  const verb = item.scheduleType === 'expiry' ? 'Expires' : 'Renews';
  if (daysUntil === 0) return `${verb} today`;
  if (daysUntil === 1) return `${verb} tomorrow`;
  if (daysUntil > 1) return `${verb} in ${daysUntil} days`;
  const ago = -daysUntil;
  if (item.scheduleType === 'expiry') return `Expired ${ago === 1 ? 'yesterday' : `${ago} days ago`}`;
  return `Overdue by ${ago} ${ago === 1 ? 'day' : 'days'}`;
}

export function buildDashboard(items: Item[], today: string, windowDays = 30): DashboardSummary {
  const active = items.filter((item) => item.status === 'active');

  const totals = new Map<string, number>();
  for (const item of active) {
    if (!isRecurring(item) || item.amountCents == null) continue;
    const monthly = monthlyEquivalentCents(item.amountCents, item.intervalUnit, item.intervalCount);
    totals.set(item.currency, (totals.get(item.currency) ?? 0) + monthly);
  }

  const due = active
    .map((item) => toDueItem(item, today))
    .filter((d): d is DueItem => d !== null)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return {
    totals: [...totals]
      .map(([currency, monthlyCents]) => ({ currency, monthlyCents }))
      .sort((a, b) => b.monthlyCents - a.monthlyCents),
    activeCount: active.length,
    upcoming: due.filter((d) => d.daysUntil >= 0 && d.daysUntil <= windowDays),
    needsAttention: due.filter((d) => d.daysUntil < 0),
  };
}

function isRecurring(
  item: Item,
): item is Item & { intervalUnit: NonNullable<Item['intervalUnit']>; intervalCount: number } {
  return item.scheduleType === 'recurring' && item.intervalUnit != null && item.intervalCount != null;
}
