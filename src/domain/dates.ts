/**
 * Calendar-date helpers. Dates are stored as local `YYYY-MM-DD` strings so a
 * renewal on "Oct 18" stays on Oct 18 regardless of the device's time zone.
 */

export type IntervalUnit = 'day' | 'week' | 'month' | 'year';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isISODate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

/** Converts a JS Date to its local calendar date. */
export function toISODate(date: Date): string {
  return formatParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Converts a `YYYY-MM-DD` string to a JS Date at local midnight. */
export function fromISODate(iso: string): Date {
  const { y, m, d } = parse(iso);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

/**
 * Adds `count` units to a date. Month and year steps clamp to the end of the
 * month, so Jan 31 + 1 month = Feb 28 (or 29 in a leap year).
 */
export function addInterval(iso: string, unit: IntervalUnit, count: number): string {
  const { y, m, d } = parse(iso);
  if (unit === 'day' || unit === 'week') {
    const days = unit === 'day' ? count : count * 7;
    // Use noon UTC so DST changes can never shift the calendar date.
    const date = new Date(Date.UTC(y, m - 1, d + days, 12));
    return formatParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }
  const months = unit === 'month' ? count : count * 12;
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return formatParts(year, month, Math.min(d, daysInMonth(year, month)));
}

/**
 * First occurrence of a repeating schedule that is on or after `fromISO`.
 * Every occurrence is computed from the anchor, so a bill on the 31st comes
 * back to the 31st after a short month instead of drifting to the 28th.
 */
export function nextOccurrenceOnOrAfter(
  anchorISO: string,
  unit: IntervalUnit,
  count: number,
  fromISO: string,
): string {
  if (anchorISO >= fromISO) return anchorISO;

  if (unit === 'day' || unit === 'week') {
    const step = unit === 'day' ? count : count * 7;
    const periods = Math.ceil(daysBetween(anchorISO, fromISO) / step);
    return addInterval(anchorISO, 'day', periods * step);
  }

  const stepMonths = unit === 'month' ? count : count * 12;
  const a = parse(anchorISO);
  const f = parse(fromISO);
  // Start one step early in case the day of month pushes past `fromISO`.
  let periods = Math.max(0, Math.floor(((f.y - a.y) * 12 + (f.m - a.m)) / stepMonths) - 1);
  let candidate = addInterval(anchorISO, 'month', periods * stepMonths);
  while (candidate < fromISO) {
    periods += 1;
    candidate = addInterval(anchorISO, 'month', periods * stepMonths);
  }
  return candidate;
}

/** Whole days from `fromISO` to `toISO` (negative when `toISO` is earlier). */
export function daysBetween(fromISO: string, toISO: string): number {
  const a = parse(fromISO);
  const b = parse(toISO);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}

export function formatDate(iso: string): string {
  return fromISODate(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function parse(iso: string): { y: number; m: number; d: number } {
  const match = ISO_DATE.exec(iso);
  if (!match) throw new Error(`Invalid date: ${iso}`);
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function formatParts(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
