import type { Item, PricePoint } from './types';

export interface PriceIncrease {
  item: Item;
  fromCents: number;
  toCents: number;
  /** When the earlier price took effect (`YYYY-MM-DD`). */
  since: string;
  /** Whole-number percentage, e.g. 16 for +16%. */
  percent: number;
}

/**
 * Active items that cost more now than when their price was first recorded,
 * biggest rise first. Price points in another currency than the item's
 * current one are ignored, since they can't be compared.
 */
export function findPriceIncreases(
  items: readonly Item[],
  history: readonly Omit<PricePoint, 'id'>[],
): PriceIncrease[] {
  const firstPrice = new Map<number, Omit<PricePoint, 'id'>>();
  for (const point of history) {
    const earliest = firstPrice.get(point.itemId);
    if (!earliest || point.effectiveDate < earliest.effectiveDate) firstPrice.set(point.itemId, point);
  }

  const increases: PriceIncrease[] = [];
  for (const item of items) {
    const first = firstPrice.get(item.id);
    if (item.status !== 'active' || item.amountCents == null || !first) continue;
    if (first.currency !== item.currency || first.amountCents <= 0) continue;
    if (item.amountCents <= first.amountCents) continue;
    increases.push({
      item,
      fromCents: first.amountCents,
      toCents: item.amountCents,
      since: first.effectiveDate,
      percent: Math.round(((item.amountCents - first.amountCents) / first.amountCents) * 100),
    });
  }
  return increases.sort((a, b) => b.percent - a.percent);
}
