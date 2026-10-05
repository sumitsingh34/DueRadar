import { daysBetween } from './dates';
import type { Asset, AssetKind, Item } from './types';
import type { UsageMap } from './usage';

export const ASSET_KINDS: Record<
  AssetKind,
  { label: string; plural: string; color: string; placeholder: string }
> = {
  vehicle: { label: 'Vehicle', plural: 'vehicles', color: '#00A2C7', placeholder: 'Honda Civic, my scooter…' },
  home: { label: 'Home', plural: 'homes', color: '#46A758', placeholder: 'Home, the cabin…' },
};

/** "Vehicle", "Home" or "Vehicle or home". */
export function assetKindsLabel(kinds: readonly AssetKind[]): string {
  const labels = kinds.map((kind) => ASSET_KINDS[kind].label);
  const last = labels[labels.length - 1];
  return labels.length > 1 ? `${labels.slice(0, -1).join(', ')} or ${last.toLowerCase()}` : last;
}

/** Odometer readings older than this are worth refreshing when distances are tracked. */
export const READING_STALE_DAYS = 30;

/**
 * Vehicles whose distance-based tasks can't be tracked well: they have no
 * odometer reading yet, or the latest is over a month old.
 */
export function vehiclesNeedingReading(
  assets: readonly Asset[],
  items: readonly Item[],
  usage: UsageMap,
  today: string,
): { asset: Asset; lastDate: string | null }[] {
  return assets
    .filter((asset) => asset.kind === 'vehicle')
    .filter((asset) =>
      items.some(
        (item) =>
          item.assetId === asset.id &&
          item.status === 'active' &&
          item.scheduleType === 'task' &&
          item.nextUsage != null,
      ),
    )
    .map((asset) => ({ asset, lastDate: usage.get(asset.id)?.readingDate ?? null }))
    .filter(({ lastDate }) => lastDate === null || daysBetween(lastDate, today) > READING_STALE_DAYS);
}
