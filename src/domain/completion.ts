import { addInterval } from './dates';
import type { Item } from './types';

/**
 * Where a task's schedule moves once it's done on `date`: its next date counts
 * from that day, and its next distance from the odometer reading, when given.
 */
export function nextAfterDone(
  item: Pick<Item, 'intervalUnit' | 'intervalCount' | 'dueDate' | 'usageInterval' | 'nextUsage'>,
  date: string,
  reading: number | null,
): { dueDate: string | null; nextUsage: number | null } {
  return {
    dueDate:
      item.intervalUnit && item.intervalCount
        ? addInterval(date, item.intervalUnit, item.intervalCount)
        : item.dueDate,
    nextUsage: item.usageInterval != null && reading != null ? reading + item.usageInterval : item.nextUsage,
  };
}

/**
 * A manual renewal's next date. Unlike a task, it keeps to its schedule: a
 * domain renewed early still expires on the same day next year.
 */
export function nextAfterRenewal(item: Pick<Item, 'intervalUnit' | 'intervalCount' | 'dueDate'>): string | null {
  if (!item.dueDate || !item.intervalUnit || !item.intervalCount) return null;
  return addInterval(item.dueDate, item.intervalUnit, item.intervalCount);
}
