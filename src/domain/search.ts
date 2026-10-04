import { getCategory } from './categories';
import type { Item } from './types';

/**
 * Whether an item matches what the user typed. Every word must appear in the
 * name, company, category or notes, so "car ins" finds "Car insurance".
 */
export function matchesSearch(item: Item, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = [item.name, item.provider, getCategory(item.category).label, item.notes]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return words.every((word) => text.includes(word));
}
