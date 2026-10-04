import { listAllPriceHistory, listItems } from '@/db/items';
import type { Item, PricePoint } from '@/domain/types';
import { useLiveData } from '@/hooks/use-live-data';

/** All items, kept up to date while the screen is focused. Null while loading. */
export function useItems(): Item[] | null {
  return useLiveData(listItems);
}

/** Every item's price history, kept up to date while the screen is focused. */
export function usePriceHistory(): Omit<PricePoint, 'id'>[] | null {
  return useLiveData(listAllPriceHistory);
}
