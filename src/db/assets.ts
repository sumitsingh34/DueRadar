import type { SQLiteDatabase } from 'expo-sqlite';

import { emitDataChanged } from '@/db/events';
import type { Asset, AssetInput, AssetKind, DistanceUnit, UsageReading } from '@/domain/types';

interface AssetRow {
  id: number;
  name: string;
  kind: string;
  usage_unit: string | null;
  details: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ReadingRow {
  id: number;
  asset_id: number;
  reading: number;
  reading_date: string;
}

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;

export async function listAssets(db: SQLiteDatabase): Promise<Asset[]> {
  const rows = await db.getAllAsync<AssetRow>('SELECT * FROM assets ORDER BY name COLLATE NOCASE');
  return rows.map(toAsset);
}

export async function getAsset(db: SQLiteDatabase, id: number): Promise<Asset | null> {
  const row = await db.getFirstAsync<AssetRow>('SELECT * FROM assets WHERE id = ?', id);
  return row ? toAsset(row) : null;
}

/** Adds a vehicle or home, with the vehicle's current odometer reading if known. */
export async function createAsset(
  db: SQLiteDatabase,
  input: AssetInput,
  reading?: { reading: number; date: string } | null,
): Promise<number> {
  let id = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      'INSERT INTO assets (name, kind, usage_unit, details, notes) VALUES (?, ?, ?, ?, ?)',
      input.name.trim(),
      input.kind,
      input.kind === 'vehicle' ? input.usageUnit : null,
      JSON.stringify(input.details),
      input.notes?.trim() || null,
    );
    id = result.lastInsertRowId;
    if (reading) await insertReading(db, id, reading.reading, reading.date);
  });
  emitDataChanged();
  return id;
}

export async function updateAsset(db: SQLiteDatabase, id: number, input: AssetInput): Promise<void> {
  await db.runAsync(
    `UPDATE assets SET name = ?, usage_unit = ?, details = ?, notes = ?, updated_at = ${NOW} WHERE id = ?`,
    input.name.trim(),
    input.kind === 'vehicle' ? input.usageUnit : null,
    JSON.stringify(input.details),
    input.notes?.trim() || null,
    id,
  );
  emitDataChanged();
}

/** Deletes a vehicle or home and its readings. Its items stay, without it. */
export async function deleteAsset(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM assets WHERE id = ?', id);
  emitDataChanged();
}

export async function addReading(db: SQLiteDatabase, assetId: number, reading: number, date: string): Promise<void> {
  await insertReading(db, assetId, reading, date);
  emitDataChanged();
}

/** Every vehicle's odometer readings, oldest first. */
export async function listReadings(db: SQLiteDatabase): Promise<UsageReading[]> {
  const rows = await db.getAllAsync<ReadingRow>('SELECT * FROM usage_readings ORDER BY reading_date, id');
  return rows.map((r) => ({ id: r.id, assetId: r.asset_id, reading: r.reading, date: r.reading_date }));
}

async function insertReading(db: SQLiteDatabase, assetId: number, reading: number, date: string) {
  await db.runAsync(
    'INSERT INTO usage_readings (asset_id, reading, reading_date) VALUES (?, ?, ?)',
    assetId,
    reading,
    date,
  );
}

function toAsset(row: AssetRow): Asset {
  let details: Record<string, unknown> = {};
  try {
    const value: unknown = JSON.parse(row.details);
    if (value && typeof value === 'object') details = value as Record<string, unknown>;
  } catch {
    // A damaged value is treated as empty.
  }
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as AssetKind,
    usageUnit: row.usage_unit as DistanceUnit | null,
    details,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
