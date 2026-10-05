import { addInterval, daysBetween } from './dates';
import type { Asset, DistanceUnit, Item, UsageReading } from './types';

export const DISTANCE_UNITS: readonly DistanceUnit[] = ['km', 'mi'];

/** Odometer state of a vehicle, used to work out distance-based due dates. */
export interface VehicleUsage {
  unit: DistanceUnit;
  /** The latest reading and the date it was taken. */
  reading: number;
  readingDate: string;
  /** Average distance per day, when recent readings allow an estimate. */
  perDay: number | null;
}

/** Vehicle usage by asset ID. */
export type UsageMap = ReadonlyMap<number, VehicleUsage>;

/** Readings within this many days of the latest one count towards the average. */
const RATE_WINDOW_DAYS = 365;
/** The readings behind an average must span at least this many days. */
const MIN_RATE_SPAN_DAYS = 14;
/** Estimates further out than this aren't useful, e.g. for a car that's rarely driven. */
const MAX_ESTIMATE_DAYS = 3650;

/** The latest reading and the average daily distance of a vehicle, or null without readings. */
export function summarizeUsage(asset: Asset, readings: readonly UsageReading[]): VehicleUsage | null {
  if (asset.kind !== 'vehicle' || !asset.usageUnit) return null;
  // On the same day, the last one entered counts, so a typo can be corrected.
  const own = readings
    .filter((r) => r.assetId === asset.id)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  if (own.length === 0) return null;

  const latest = own[own.length - 1];
  const windowStart = addInterval(latest.date, 'day', -RATE_WINDOW_DAYS);
  const earliest = own.find((r) => r.date >= windowStart)!;
  const span = daysBetween(earliest.date, latest.date);
  const perDay =
    span >= MIN_RATE_SPAN_DAYS && latest.reading > earliest.reading
      ? (latest.reading - earliest.reading) / span
      : null;
  return { unit: asset.usageUnit, reading: latest.reading, readingDate: latest.date, perDay };
}

export function buildUsageMap(assets: readonly Asset[], readings: readonly UsageReading[]): UsageMap {
  const map = new Map<number, VehicleUsage>();
  for (const asset of assets) {
    const usage = summarizeUsage(asset, readings);
    if (usage) map.set(asset.id, usage);
  }
  return map;
}

/** How far a vehicle task is from the odometer reading it's due at. */
export interface DistanceDue {
  unit: DistanceUnit;
  /** The odometer reading the task is due at. */
  target: number;
  /** Distance left from the latest reading. Zero or less once it's due. */
  left: number;
  /**
   * When the target is reached: the latest reading's date once it has been,
   * otherwise an estimate from the average daily distance, if there is one.
   */
  date: string | null;
}

export function distanceDue(item: Item, usage: VehicleUsage | undefined): DistanceDue | null {
  if (item.scheduleType !== 'task' || item.nextUsage == null || !usage) return null;
  // A unit mismatch means the vehicle's unit was changed later; don't compare km with miles.
  if (item.usageUnit !== usage.unit) return null;

  const left = item.nextUsage - usage.reading;
  let date: string | null = null;
  if (left <= 0) {
    date = usage.readingDate;
  } else if (usage.perDay) {
    const days = Math.ceil(left / usage.perDay);
    if (days <= MAX_ESTIMATE_DAYS) date = addInterval(usage.readingDate, 'day', days);
  }
  return { unit: usage.unit, target: item.nextUsage, left, date };
}

/** "45,300 km". */
export function formatDistance(value: number, unit: DistanceUnit): string {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)} ${unit}`;
}

/**
 * Parses a whole number such as "45300", "45,300", "45.300" or "45 300".
 * Returns null when invalid, including decimals like "45300.5".
 */
export function parseDistanceInput(input: string): number | null {
  const value = input.trim();
  if (!/^(\d{1,3}([,.\s'’]\d{3})+|\d{1,7})$/.test(value)) return null;
  const number = Number(value.replace(/[,.\s'’]/g, ''));
  return number <= 9_999_999 ? number : null;
}

/** Miles where they're the everyday unit (US, UK), going by the currency; km elsewhere. */
export function defaultDistanceUnit(currency: string): DistanceUnit {
  return currency === 'USD' || currency === 'GBP' ? 'mi' : 'km';
}
