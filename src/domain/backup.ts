import { CATEGORIES, getCategory, type CategoryId } from './categories';
import { isISODate, type IntervalUnit } from './dates';
import { frequencyLabel } from './frequency';
import { monthlyEquivalentCents } from './money';
import { normalizeSettings, type AppSettings } from './settings';
import { nextDueDate } from './summary';
import type { Item, ItemStatus, PricePoint, ScheduleType } from './types';

export const BACKUP_FORMAT = 1;

export interface Backup {
  app: 'DueRadar';
  format: number;
  exportedAt: string;
  settings: AppSettings;
  items: Item[];
  priceHistory: Omit<PricePoint, 'id'>[];
}

export class BackupError extends Error {}

export function createBackup(
  items: Item[],
  priceHistory: Omit<PricePoint, 'id'>[],
  settings: AppSettings,
  now = new Date(),
): Backup {
  return { app: 'DueRadar', format: BACKUP_FORMAT, exportedAt: now.toISOString(), settings, items, priceHistory };
}

/** Parses and validates a backup file. Throws BackupError with a message for the user. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('This file isn’t a DueRadar backup.');
  }
  if (!isRecord(data) || data.app !== 'DueRadar' || !Array.isArray(data.items)) {
    throw new BackupError('This file isn’t a DueRadar backup.');
  }
  if (typeof data.format !== 'number' || data.format > BACKUP_FORMAT) {
    throw new BackupError('This backup was made by a newer version of DueRadar. Update the app first.');
  }

  const items = data.items.map((raw, index) => parseItem(raw, index));
  const ids = new Set(items.map((item) => item.id));
  if (ids.size !== items.length) throw new BackupError('The backup contains duplicate items.');

  const priceHistory = (Array.isArray(data.priceHistory) ? data.priceHistory : [])
    .filter(isRecord)
    .filter(
      (p) =>
        typeof p.itemId === 'number' &&
        ids.has(p.itemId) &&
        isCents(p.amountCents) &&
        typeof p.effectiveDate === 'string' &&
        isISODate(p.effectiveDate),
    )
    .map((p) => ({
      itemId: p.itemId as number,
      amountCents: p.amountCents as number,
      currency: isCurrency(p.currency) ? p.currency : 'USD',
      effectiveDate: p.effectiveDate as string,
    }));

  return {
    app: 'DueRadar',
    format: data.format,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    settings: normalizeSettings(isRecord(data.settings) ? data.settings : {}),
    // Drop links to items that are not in the backup.
    items: items.map((item) => ({
      ...item,
      parentId: item.parentId != null && ids.has(item.parentId) ? item.parentId : null,
    })),
    priceHistory,
  };
}

const CSV_HEADER = [
  'Name',
  'Category',
  'Type',
  'Cost',
  'Currency',
  'Frequency',
  'Next date',
  'Auto-renew',
  'Status',
  'Company',
  'Notes',
  'Monthly cost',
];

/** A spreadsheet-friendly export. The JSON backup is the one to restore from. */
export function itemsToCsv(items: readonly Item[], today: string): string {
  const rows = items.map((item) => {
    const frequency =
      item.scheduleType === 'recurring' && item.intervalUnit && item.intervalCount
        ? { unit: item.intervalUnit, count: item.intervalCount }
        : null;
    const monthly =
      frequency && item.amountCents != null && item.status === 'active'
        ? (monthlyEquivalentCents(item.amountCents, frequency.unit, frequency.count) / 100).toFixed(2)
        : '';
    return [
      item.name,
      getCategory(item.category).label,
      item.scheduleType === 'expiry' ? 'Expires' : 'Renews',
      item.amountCents != null ? (item.amountCents / 100).toFixed(2) : '',
      item.currency,
      frequency ? frequencyLabel(frequency) : '',
      nextDueDate(item, today) ?? '',
      item.scheduleType === 'recurring' ? (item.autoRenew ? 'Yes' : 'No') : '',
      item.status[0].toUpperCase() + item.status.slice(1),
      item.provider ?? '',
      item.notes ?? '',
      monthly,
    ];
  });
  // The byte-order mark makes Excel read the file as UTF-8 (₹, €, etc.).
  return '﻿' + [CSV_HEADER, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

function parseItem(raw: unknown, index: number): Item {
  const fail = (): never => {
    throw new BackupError(`Item ${index + 1} in the backup is damaged.`);
  };
  if (!isRecord(raw)) return fail();

  const id = raw.id;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const scheduleType = raw.scheduleType;
  if (!Number.isInteger(id) || (id as number) <= 0 || !name) return fail();
  if (scheduleType !== 'recurring' && scheduleType !== 'expiry' && scheduleType !== 'usage') return fail();

  const intervalUnit = ['day', 'week', 'month', 'year'].includes(raw.intervalUnit as string)
    ? (raw.intervalUnit as IntervalUnit)
    : null;
  const intervalCount = isPositiveInt(raw.intervalCount) ? raw.intervalCount : null;

  return {
    id: id as number,
    name,
    category: CATEGORIES.some((c) => c.id === raw.category) ? (raw.category as CategoryId) : 'other',
    scheduleType: scheduleType as ScheduleType,
    amountCents: isCents(raw.amountCents) ? raw.amountCents : null,
    currency: isCurrency(raw.currency) ? raw.currency : 'USD',
    intervalUnit: intervalUnit && intervalCount ? intervalUnit : null,
    intervalCount: intervalUnit && intervalCount ? intervalCount : null,
    startDate: optionalDate(raw.startDate),
    dueDate: optionalDate(raw.dueDate),
    usageInterval: isPositiveInt(raw.usageInterval) ? raw.usageInterval : null,
    usageUnit: typeof raw.usageUnit === 'string' ? raw.usageUnit : null,
    nextUsage: isPositiveInt(raw.nextUsage) ? raw.nextUsage : null,
    autoRenew: raw.autoRenew === true,
    status: (['active', 'paused', 'cancelled'] as const).includes(raw.status as ItemStatus)
      ? (raw.status as ItemStatus)
      : 'active',
    provider: optionalText(raw.provider),
    notes: optionalText(raw.notes),
    details: isRecord(raw.details) ? raw.details : {},
    parentId: isPositiveInt(raw.parentId) ? raw.parentId : null,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInt(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0;
}

function isCents(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isCurrency(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value);
}

function optionalDate(value: unknown): string | null {
  return typeof value === 'string' && isISODate(value) ? value : null;
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}
