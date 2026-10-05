import { getCategory } from './categories';
import type { Asset, Item } from './types';

/**
 * Whether an item matches what the user typed. Every word must appear in the
 * name, company, category, notes or the vehicle or home it belongs to, so
 * "car ins" finds "Car insurance" and "civic" finds everything for that car.
 */
export function matchesSearch(item: Item, query: string, assetName?: string | null): boolean {
  return matchesWords([item.name, item.provider, getCategory(item.category).label, item.notes, assetName], query);
}

/** Whether a vehicle or home matches what the user typed: its name, plate number or notes. */
export function matchesAssetSearch(asset: Asset, query: string): boolean {
  const plate = typeof asset.details.plate === 'string' ? asset.details.plate : null;
  return matchesWords([asset.name, plate, asset.notes], query);
}

function matchesWords(fields: readonly (string | null | undefined)[], query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = fields.filter(Boolean).join(' ').toLowerCase();
  return words.every((word) => text.includes(word));
}
