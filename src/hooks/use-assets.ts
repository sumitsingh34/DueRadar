import type { SQLiteDatabase } from 'expo-sqlite';

import { listAssets, listReadings } from '@/db/assets';
import type { Asset, UsageReading } from '@/domain/types';
import { buildUsageMap, type UsageMap } from '@/domain/usage';
import { useLiveData } from '@/hooks/use-live-data';

export interface AssetData {
  assets: Asset[];
  readings: UsageReading[];
  /** Each vehicle's latest odometer reading and average daily distance. */
  usage: UsageMap;
}

async function loadAssetData(db: SQLiteDatabase): Promise<AssetData> {
  const [assets, readings] = await Promise.all([listAssets(db), listReadings(db)]);
  return { assets, readings, usage: buildUsageMap(assets, readings) };
}

/** Vehicles and homes with their odometer readings, kept up to date while the screen is focused. */
export function useAssets(): AssetData | null {
  return useLiveData(loadAssetData);
}
