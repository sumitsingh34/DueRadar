import type { IntervalUnit } from './dates';

/** Amounts are stored as integer cents to avoid floating-point rounding. */

/** Used until a currency setting exists. */
export const DEFAULT_CURRENCY = 'USD';

const AMOUNT_INPUT = /^\d{1,9}([.,]\d{0,2})?$/;

/** Parses user input like "15", "15.49" or "15,49". Returns null when invalid. */
export function parseAmountInput(input: string): number | null {
  const value = input.trim();
  if (!AMOUNT_INPUT.test(value)) return null;
  const [whole, fraction = ''] = value.split(/[.,]/);
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** Formats cents for an input field, e.g. 1549 -> "15.49". */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

const MONTHS_PER_UNIT: Record<IntervalUnit, number> = {
  day: 12 / 365,
  week: 12 / 52,
  month: 1,
  year: 12,
};

/** What a repeating charge costs per month on average, in cents. */
export function monthlyEquivalentCents(cents: number, unit: IntervalUnit, count: number): number {
  return cents / (MONTHS_PER_UNIT[unit] * count);
}
