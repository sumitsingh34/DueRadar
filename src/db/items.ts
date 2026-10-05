import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import { deleteAttachmentFile } from '@/attachments/storage';
import { attachmentPaths } from '@/db/attachments';
import { emitDataChanged } from '@/db/events';
import type { CategoryId } from '@/domain/categories';
import { nextAfterDone, nextAfterRenewal } from '@/domain/completion';
import { todayISO, type IntervalUnit } from '@/domain/dates';
import { normalizeReminderDays } from '@/domain/settings';
import type {
  Completion,
  DistanceUnit,
  Item,
  ItemInput,
  ItemStatus,
  PricePoint,
  ScheduleType,
} from '@/domain/types';

interface ItemRow {
  id: number;
  name: string;
  category: string;
  schedule_type: string;
  amount_cents: number | null;
  currency: string;
  interval_unit: string | null;
  interval_count: number | null;
  start_date: string | null;
  due_date: string | null;
  due_time: string | null;
  reminder_days: string | null;
  usage_interval: number | null;
  usage_unit: string | null;
  next_usage: number | null;
  auto_renew: number;
  status: string;
  provider: string | null;
  notes: string | null;
  details: string;
  parent_id: number | null;
  asset_id: number | null;
  created_at: string;
  updated_at: string;
}

interface PriceRow {
  id: number;
  item_id: number;
  amount_cents: number;
  currency: string;
  effective_date: string;
}

interface CompletionRow {
  id: number;
  item_id: number;
  done_date: string;
  amount_cents: number | null;
  currency: string | null;
  usage_reading: number | null;
  note: string | null;
}

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;

export async function listItems(db: SQLiteDatabase): Promise<Item[]> {
  const rows = await db.getAllAsync<ItemRow>('SELECT * FROM items ORDER BY name COLLATE NOCASE');
  return rows.map(toItem);
}

export async function getItem(db: SQLiteDatabase, id: number): Promise<Item | null> {
  const row = await db.getFirstAsync<ItemRow>('SELECT * FROM items WHERE id = ?', id);
  return row ? toItem(row) : null;
}

export async function createItem(db: SQLiteDatabase, input: ItemInput): Promise<number> {
  let id = 0;
  await db.withTransactionAsync(async () => {
    const columns = toColumns(input);
    const names = Object.keys(columns);
    const result = await db.runAsync(
      `INSERT INTO items (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`,
      Object.values(columns),
    );
    id = result.lastInsertRowId;
    if (input.amountCents != null) {
      await addPricePoint(db, id, input.amountCents, input.currency);
    }
  });
  emitDataChanged();
  return id;
}

/** Saves edits and records a price-history entry when the cost changes. */
export async function updateItem(db: SQLiteDatabase, id: number, input: ItemInput): Promise<void> {
  await db.withTransactionAsync(async () => {
    const before = await db.getFirstAsync<Pick<ItemRow, 'amount_cents' | 'currency'>>(
      'SELECT amount_cents, currency FROM items WHERE id = ?',
      id,
    );
    if (!before) throw new Error(`Item ${id} not found`);

    const columns = toColumns(input);
    await db.runAsync(
      `UPDATE items SET ${Object.keys(columns)
        .map((c) => `${c} = ?`)
        .join(', ')}, updated_at = ${NOW} WHERE id = ?`,
      [...Object.values(columns), id],
    );

    const priceChanged =
      input.amountCents != null &&
      (input.amountCents !== before.amount_cents || input.currency !== before.currency);
    if (priceChanged) {
      await addPricePoint(db, id, input.amountCents!, input.currency);
    }
  });
  emitDataChanged();
}

export async function deleteItem(db: SQLiteDatabase, id: number): Promise<void> {
  const files = await attachmentPaths(db, id);
  // Deleting the item also deletes its price history, history and attachment rows.
  await db.runAsync('DELETE FROM items WHERE id = ?', id);
  for (const path of files) deleteAttachmentFile(path);
  emitDataChanged();
}

/** Moves a manually renewed item's due date to its next renewal, and notes the renewal. */
export async function markRenewed(db: SQLiteDatabase, item: Item): Promise<void> {
  const dueDate = nextAfterRenewal(item);
  if (!dueDate) return;
  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE items SET due_date = ?, updated_at = ${NOW} WHERE id = ?`, dueDate, item.id);
    await db.runAsync(
      'INSERT INTO completions (item_id, done_date, amount_cents, currency) VALUES (?, ?, ?, ?)',
      item.id,
      todayISO(),
      item.amountCents,
      item.amountCents != null ? item.currency : null,
    );
  });
  emitDataChanged();
}

export interface TaskDone {
  date: string;
  /** Odometer reading when it was done; also saved as the vehicle's reading. */
  usage: number | null;
  amountCents: number | null;
  note: string | null;
}

/**
 * Notes that a task was done and moves it to its next date and distance,
 * counted from when it was done. Saves the odometer reading for the vehicle.
 */
export async function completeTask(db: SQLiteDatabase, item: Item, done: TaskDone): Promise<void> {
  const next = nextAfterDone(item, done.date, done.usage);
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO completions (item_id, done_date, amount_cents, currency, usage_reading, note) VALUES (?, ?, ?, ?, ?, ?)',
      item.id,
      done.date,
      done.amountCents,
      done.amountCents != null ? item.currency : null,
      done.usage,
      done.note?.trim() || null,
    );
    await db.runAsync(
      `UPDATE items SET due_date = ?, next_usage = ?, updated_at = ${NOW} WHERE id = ?`,
      next.dueDate,
      next.nextUsage,
      item.id,
    );
    if (item.assetId != null && done.usage != null) {
      await db.runAsync(
        'INSERT INTO usage_readings (asset_id, reading, reading_date) VALUES (?, ?, ?)',
        item.assetId,
        done.usage,
        done.date,
      );
    }
  });
  emitDataChanged();
}

/** An item's history, newest first. */
export async function listCompletions(db: SQLiteDatabase, itemId: number): Promise<Completion[]> {
  const rows = await db.getAllAsync<CompletionRow>(
    'SELECT * FROM completions WHERE item_id = ? ORDER BY done_date DESC, id DESC',
    itemId,
  );
  return rows.map(toCompletion);
}

/** Every item's history, for backups. */
export async function listAllCompletions(db: SQLiteDatabase): Promise<Omit<Completion, 'id'>[]> {
  const rows = await db.getAllAsync<CompletionRow>('SELECT * FROM completions ORDER BY item_id, done_date, id');
  return rows.map((r) => ({
    itemId: r.item_id,
    date: r.done_date,
    amountCents: r.amount_cents,
    currency: r.currency,
    usage: r.usage_reading,
    note: r.note,
  }));
}

/** Switches every item, and its price history, to one currency. Amounts are not converted. */
export async function setCurrencyForAllItems(db: SQLiteDatabase, currency: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE items SET currency = ?, updated_at = ${NOW} WHERE currency != ?`,
      currency,
      currency,
    );
    await db.runAsync('UPDATE price_history SET currency = ?', currency);
    await db.runAsync('UPDATE completions SET currency = ? WHERE currency IS NOT NULL', currency);
  });
  emitDataChanged();
}

/** Price history of every item, for backups. */
export async function listAllPriceHistory(db: SQLiteDatabase): Promise<Omit<PricePoint, 'id'>[]> {
  const rows = await db.getAllAsync<PriceRow>(
    'SELECT * FROM price_history ORDER BY item_id, effective_date, id',
  );
  return rows.map((r) => ({
    itemId: r.item_id,
    amountCents: r.amount_cents,
    currency: r.currency,
    effectiveDate: r.effective_date,
  }));
}

/** Oldest first. */
export async function getPriceHistory(db: SQLiteDatabase, itemId: number): Promise<PricePoint[]> {
  const rows = await db.getAllAsync<PriceRow>(
    'SELECT * FROM price_history WHERE item_id = ? ORDER BY effective_date, id',
    itemId,
  );
  return rows.map((r) => ({
    id: r.id,
    itemId: r.item_id,
    amountCents: r.amount_cents,
    currency: r.currency,
    effectiveDate: r.effective_date,
  }));
}

async function addPricePoint(db: SQLiteDatabase, itemId: number, cents: number, currency: string) {
  await db.runAsync(
    'INSERT INTO price_history (item_id, amount_cents, currency, effective_date) VALUES (?, ?, ?, ?)',
    itemId,
    cents,
    currency,
    todayISO(),
  );
}

function toColumns(input: ItemInput): Record<string, SQLiteBindValue> {
  const repeats = input.scheduleType !== 'expiry';
  // Distances only apply to tasks of a vehicle.
  const distance = input.scheduleType === 'task' && input.assetId != null && input.usageInterval != null;
  return {
    name: input.name.trim(),
    category: input.category,
    schedule_type: input.scheduleType,
    amount_cents: input.amountCents,
    currency: input.currency,
    interval_unit: repeats ? input.intervalUnit : null,
    interval_count: repeats ? input.intervalCount : null,
    start_date: input.startDate,
    due_date: input.dueDate,
    due_time: input.scheduleType === 'expiry' ? input.dueTime : null,
    reminder_days: input.reminderDays ? JSON.stringify(input.reminderDays) : null,
    usage_interval: distance ? input.usageInterval : null,
    usage_unit: distance ? input.usageUnit : null,
    next_usage: distance ? input.nextUsage : null,
    auto_renew: input.scheduleType === 'recurring' && input.autoRenew ? 1 : 0,
    status: input.status,
    provider: input.provider?.trim() || null,
    notes: input.notes?.trim() || null,
    asset_id: input.assetId,
  };
}

function toItem(row: ItemRow): Item {
  return {
    id: row.id,
    name: row.name,
    category: row.category as CategoryId,
    scheduleType: row.schedule_type as ScheduleType,
    amountCents: row.amount_cents,
    currency: row.currency,
    intervalUnit: row.interval_unit as IntervalUnit | null,
    intervalCount: row.interval_count,
    startDate: row.start_date,
    dueDate: row.due_date,
    dueTime: row.due_time,
    reminderDays: parseReminderDays(row.reminder_days),
    usageInterval: row.usage_interval,
    usageUnit: row.usage_unit as DistanceUnit | null,
    nextUsage: row.next_usage,
    autoRenew: row.auto_renew === 1,
    status: row.status as ItemStatus,
    provider: row.provider,
    notes: row.notes,
    details: parseDetails(row.details),
    parentId: row.parent_id,
    assetId: row.asset_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCompletion(row: CompletionRow): Completion {
  return {
    id: row.id,
    itemId: row.item_id,
    date: row.done_date,
    amountCents: row.amount_cents,
    currency: row.currency,
    usage: row.usage_reading,
    note: row.note,
  };
}

function parseReminderDays(json: string | null): number[] | null {
  if (json == null) return null;
  try {
    return normalizeReminderDays(JSON.parse(json));
  } catch {
    return null;
  }
}

function parseDetails(json: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(json);
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
