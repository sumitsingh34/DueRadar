import type { IntervalUnit } from './dates';

export interface Frequency {
  unit: IntervalUnit;
  count: number;
}

export const FREQUENCY_PRESETS: readonly (Frequency & { label: string })[] = [
  { label: 'Weekly', unit: 'week', count: 1 },
  { label: 'Monthly', unit: 'month', count: 1 },
  { label: 'Every 3 months', unit: 'month', count: 3 },
  { label: 'Every 6 months', unit: 'month', count: 6 },
  { label: 'Yearly', unit: 'year', count: 1 },
  { label: 'Every 2 years', unit: 'year', count: 2 },
];

export const DEFAULT_FREQUENCY: Frequency = { unit: 'month', count: 1 };

const UNIT_NAMES: Record<IntervalUnit, [singular: string, short: string]> = {
  day: ['day', 'day'],
  week: ['week', 'wk'],
  month: ['month', 'mo'],
  year: ['year', 'yr'],
};

/** "Monthly", "Every 3 months". */
export function frequencyLabel({ unit, count }: Frequency): string {
  const preset = FREQUENCY_PRESETS.find((p) => p.unit === unit && p.count === count);
  if (preset) return preset.label;
  if (count === 1) return `Every ${UNIT_NAMES[unit][0]}`;
  return `Every ${count} ${UNIT_NAMES[unit][0]}s`;
}

/** Suffix for a price: "/mo", "/yr", "/3 mo". */
export function costSuffix({ unit, count }: Frequency): string {
  const short = UNIT_NAMES[unit][1];
  return count === 1 ? `/${short}` : `/${count} ${short}`;
}
