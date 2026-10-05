import { CATEGORIES, getCategory, type CategoryId } from './categories';
import { isISODate, isTime, type IntervalUnit } from './dates';
import { frequencyLabel } from './frequency';
import { monthlyEquivalentCents } from './money';
import { normalizeReminderDays, normalizeSettings, type AppSettings } from './settings';
import { hasInterval, nextDueDate } from './summary';
import type {
  Asset,
  AssetKind,
  Completion,
  DistanceUnit,
  Item,
  ItemStatus,
  PricePoint,
  ScheduleType,
  UsageReading,
} from './types';

/**
 * Format 2 added receipt photos. Format 3 added vehicles and homes, odometer
 * readings and task history. Format 4 added times of day and each item's own
 * reminders. Older backups are still accepted.
 */
export const BACKUP_FORMAT = 4;

/** A receipt photo in a backup, with the file itself as base64. */
export interface BackupAttachment {
  itemId: number;
  kind: 'receipt';
  /** File name only. It is restored into the app's receipts folder. */
  fileName: string;
  mimeType: string | null;
  createdAt: string;
  /** The file's contents, base64-encoded. */
  data: string;
}

export interface Backup {
  app: 'DueRadar';
  format: number;
  exportedAt: string;
  settings: AppSettings;
  items: Item[];
  priceHistory: Omit<PricePoint, 'id'>[];
  attachments: BackupAttachment[];
  assets: Asset[];
  usageReadings: Omit<UsageReading, 'id'>[];
  completions: Omit<Completion, 'id'>[];
}

export type BackupContents = Omit<Backup, 'app' | 'format' | 'exportedAt'>;

export class BackupError extends Error {}

/** A plain file name: no folders, so a backup can never write outside the receipts folder. */
const SAFE_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

export function createBackup(contents: BackupContents, now = new Date()): Backup {
  return {
    app: 'DueRadar',
    format: BACKUP_FORMAT,
    exportedAt: now.toISOString(),
    ...contents,
  };
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

  // Vehicles and homes that are damaged are left out; their items are kept without them.
  const assets: Asset[] = [];
  for (const raw of listOf(data.assets)) {
    const asset = parseAsset(raw);
    if (asset && !assets.some((a) => a.id === asset.id)) assets.push(asset);
  }
  const assetIds = new Set(assets.map((a) => a.id));

  const items = data.items.map((raw, index) => parseItem(raw, index));
  const ids = new Set(items.map((item) => item.id));
  if (ids.size !== items.length) throw new BackupError('The backup contains duplicate items.');

  const priceHistory = listOf(data.priceHistory)
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

  const usageReadings = listOf(data.usageReadings)
    .filter(
      (r) =>
        typeof r.assetId === 'number' &&
        assetIds.has(r.assetId) &&
        isCents(r.reading) &&
        typeof r.date === 'string' &&
        isISODate(r.date),
    )
    .map((r) => ({ assetId: r.assetId as number, reading: r.reading as number, date: r.date as string }));

  const completions = listOf(data.completions)
    .filter((c) => typeof c.itemId === 'number' && ids.has(c.itemId) && optionalDate(c.date) !== null)
    .map((c) => ({
      itemId: c.itemId as number,
      date: c.date as string,
      amountCents: isCents(c.amountCents) ? c.amountCents : null,
      currency: isCurrency(c.currency) ? c.currency : null,
      usage: isCents(c.usage) ? c.usage : null,
      note: optionalText(c.note),
    }));

  // Receipts with an unsafe file name, bad data or a missing item are skipped.
  const fileNames = new Set<string>();
  const attachments: BackupAttachment[] = [];
  for (const a of listOf(data.attachments)) {
    if (
      typeof a.itemId !== 'number' ||
      !ids.has(a.itemId) ||
      a.kind !== 'receipt' ||
      typeof a.fileName !== 'string' ||
      !SAFE_FILE_NAME.test(a.fileName) ||
      fileNames.has(a.fileName) ||
      typeof a.data !== 'string' ||
      !BASE64.test(a.data)
    ) {
      continue;
    }
    fileNames.add(a.fileName);
    attachments.push({
      itemId: a.itemId,
      kind: 'receipt',
      fileName: a.fileName,
      mimeType: typeof a.mimeType === 'string' ? a.mimeType : null,
      createdAt: typeof a.createdAt === 'string' ? a.createdAt : new Date().toISOString(),
      data: a.data,
    });
  }

  return {
    app: 'DueRadar',
    format: data.format,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    settings: normalizeSettings(isRecord(data.settings) ? data.settings : {}),
    // Drop links to items, vehicles or homes that are not in the backup.
    items: items.map((item) => ({
      ...item,
      parentId: item.parentId != null && ids.has(item.parentId) ? item.parentId : null,
      assetId: item.assetId != null && assetIds.has(item.assetId) ? item.assetId : null,
    })),
    priceHistory,
    attachments,
    assets,
    usageReadings,
    completions,
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
  'Start or purchase date',
  'Auto-renew',
  'Status',
  'Company',
  'Notes',
  'Monthly cost',
  'Vehicle or home',
  'Distance interval',
  'Next due at',
];

const CSV_TYPES: Record<ScheduleType, string> = {
  recurring: 'Renews',
  task: 'Repeats when done',
  expiry: 'Expires',
};

/** A spreadsheet-friendly export. The JSON backup is the one to restore from. */
export function itemsToCsv(items: readonly Item[], today: string, assets: readonly Asset[] = []): string {
  const assetNames = new Map(assets.map((a) => [a.id, a.name]));
  const rows = items.map((item) => {
    const frequency = hasInterval(item) ? { unit: item.intervalUnit, count: item.intervalCount } : null;
    const monthly =
      frequency && item.amountCents != null && item.status === 'active'
        ? (monthlyEquivalentCents(item.amountCents, frequency.unit, frequency.count) / 100).toFixed(2)
        : '';
    const unit = item.usageUnit ? ` ${item.usageUnit}` : '';
    return [
      item.name,
      getCategory(item.category).label,
      CSV_TYPES[item.scheduleType],
      item.amountCents != null ? (item.amountCents / 100).toFixed(2) : '',
      item.currency,
      frequency ? frequencyLabel(frequency) : '',
      [nextDueDate(item, today), item.dueTime].filter(Boolean).join(' '),
      item.startDate ?? '',
      item.scheduleType === 'recurring' ? (item.autoRenew ? 'Yes' : 'No') : '',
      item.status[0].toUpperCase() + item.status.slice(1),
      item.provider ?? '',
      item.notes ?? '',
      monthly,
      (item.assetId != null && assetNames.get(item.assetId)) || '',
      item.usageInterval != null ? `${item.usageInterval}${unit}` : '',
      item.nextUsage != null ? `${item.nextUsage}${unit}` : '',
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
  // "usage" was the name for tasks before format 3, though no version created them.
  const scheduleType = raw.scheduleType === 'usage' ? 'task' : raw.scheduleType;
  if (!Number.isInteger(id) || (id as number) <= 0 || !name) return fail();
  if (scheduleType !== 'recurring' && scheduleType !== 'expiry' && scheduleType !== 'task') return fail();

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
    dueTime: typeof raw.dueTime === 'string' && isTime(raw.dueTime) ? raw.dueTime : null,
    reminderDays: normalizeReminderDays(raw.reminderDays),
    usageInterval: isPositiveInt(raw.usageInterval) ? raw.usageInterval : null,
    usageUnit: isDistanceUnit(raw.usageUnit) ? raw.usageUnit : null,
    nextUsage: isCents(raw.nextUsage) ? raw.nextUsage : null,
    autoRenew: raw.autoRenew === true,
    status: (['active', 'paused', 'cancelled'] as const).includes(raw.status as ItemStatus)
      ? (raw.status as ItemStatus)
      : 'active',
    provider: optionalText(raw.provider),
    notes: optionalText(raw.notes),
    details: isRecord(raw.details) ? raw.details : {},
    parentId: isPositiveInt(raw.parentId) ? raw.parentId : null,
    assetId: isPositiveInt(raw.assetId) ? raw.assetId : null,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}

function parseAsset(raw: Record<string, unknown>): Asset | null {
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const kind = raw.kind === 'vehicle' || raw.kind === 'home' ? (raw.kind as AssetKind) : null;
  if (!isPositiveInt(raw.id) || !name || !kind) return null;
  return {
    id: raw.id,
    name,
    kind,
    usageUnit: kind === 'vehicle' ? (isDistanceUnit(raw.usageUnit) ? raw.usageUnit : 'km') : null,
    details: isRecord(raw.details) ? raw.details : {},
    notes: optionalText(raw.notes),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** The records in an optional array, skipping anything else. */
function listOf(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
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

function isDistanceUnit(value: unknown): value is DistanceUnit {
  return value === 'km' || value === 'mi';
}

function optionalDate(value: unknown): string | null {
  return typeof value === 'string' && isISODate(value) ? value : null;
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}
