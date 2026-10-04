import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import type { CategoryId } from '@/domain/categories';
import { todayISO, type IntervalUnit } from '@/domain/dates';
import type { Item, ItemInput, ItemStatus, PricePoint, ScheduleType } from '@/domain/types';

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
  usage_interval: number | null;
  usage_unit: string | null;
  next_usage: number | null;
  auto_renew: number;
  status: string;
  provider: string | null;
  notes: string | null;
  details: string;
  parent_id: number | null;
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
        .join(', ')}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
      [...Object.values(columns), id],
    );

    const priceChanged =
      input.amountCents != null &&
      (input.amountCents !== before.amount_cents || input.currency !== before.currency);
    if (priceChanged) {
      await addPricePoint(db, id, input.amountCents!, input.currency);
    }
  });
}

export async function deleteItem(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM items WHERE id = ?', id);
}

/** Moves a manually renewed item's due date to its next renewal. */
export async function setDueDate(db: SQLiteDatabase, id: number, dueDate: string): Promise<void> {
  await db.runAsync(
    `UPDATE items SET due_date = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
    dueDate,
    id,
  );
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
  const recurring = input.scheduleType === 'recurring';
  return {
    name: input.name.trim(),
    category: input.category,
    schedule_type: input.scheduleType,
    amount_cents: input.amountCents,
    currency: input.currency,
    interval_unit: recurring ? input.intervalUnit : null,
    interval_count: recurring ? input.intervalCount : null,
    due_date: input.dueDate,
    auto_renew: recurring && input.autoRenew ? 1 : 0,
    status: input.status,
    provider: input.provider?.trim() || null,
    notes: input.notes?.trim() || null,
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
    usageInterval: row.usage_interval,
    usageUnit: row.usage_unit,
    nextUsage: row.next_usage,
    autoRenew: row.auto_renew === 1,
    status: row.status as ItemStatus,
    provider: row.provider,
    notes: row.notes,
    details: parseDetails(row.details),
    parentId: row.parent_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseDetails(json: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(json);
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
