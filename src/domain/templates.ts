import type { CategoryId } from './categories';
import type { Frequency } from './frequency';

/**
 * Quick-add presets: either something that renews, or a product with a
 * warranty. Prices are left out on purpose: they differ by country and plan,
 * and they change often.
 */
export type ItemTemplate =
  | { name: string; category: CategoryId; frequency: Frequency; warrantyYears?: never }
  | { name: string; category: 'warranty'; warrantyYears: number; frequency?: never };

const MONTHLY: Frequency = { unit: 'month', count: 1 };
const HALF_YEARLY: Frequency = { unit: 'month', count: 6 };
const YEARLY: Frequency = { unit: 'year', count: 1 };

export const TEMPLATES: readonly ItemTemplate[] = [
  { name: 'Netflix', category: 'subscription', frequency: MONTHLY },
  { name: 'Spotify', category: 'subscription', frequency: MONTHLY },
  { name: 'YouTube Premium', category: 'subscription', frequency: MONTHLY },
  { name: 'Disney+', category: 'subscription', frequency: MONTHLY },
  { name: 'Hulu', category: 'subscription', frequency: MONTHLY },
  { name: 'Max', category: 'subscription', frequency: MONTHLY },
  { name: 'Apple Music', category: 'subscription', frequency: MONTHLY },
  { name: 'Apple TV+', category: 'subscription', frequency: MONTHLY },
  { name: 'Paramount+', category: 'subscription', frequency: MONTHLY },
  { name: 'Peacock', category: 'subscription', frequency: MONTHLY },
  { name: 'Audible', category: 'subscription', frequency: MONTHLY },
  { name: 'Kindle Unlimited', category: 'subscription', frequency: MONTHLY },
  { name: 'iCloud+', category: 'subscription', frequency: MONTHLY },
  { name: 'Google One', category: 'subscription', frequency: MONTHLY },
  { name: 'ChatGPT Plus', category: 'subscription', frequency: MONTHLY },
  { name: 'Xbox Game Pass', category: 'subscription', frequency: MONTHLY },
  { name: 'PlayStation Plus', category: 'subscription', frequency: YEARLY },
  { name: 'Nintendo Switch Online', category: 'subscription', frequency: YEARLY },
  { name: 'Amazon Prime', category: 'membership', frequency: YEARLY },
  { name: 'Costco', category: 'membership', frequency: YEARLY },
  { name: "Sam's Club", category: 'membership', frequency: YEARLY },
  { name: 'Walmart+', category: 'membership', frequency: YEARLY },
  { name: 'Gym membership', category: 'membership', frequency: MONTHLY },
  { name: 'AAA', category: 'membership', frequency: YEARLY },
  { name: 'Car insurance', category: 'insurance', frequency: HALF_YEARLY },
  { name: 'Home insurance', category: 'insurance', frequency: YEARLY },
  { name: 'Renters insurance', category: 'insurance', frequency: YEARLY },
  { name: 'Health insurance', category: 'insurance', frequency: MONTHLY },
  { name: 'Life insurance', category: 'insurance', frequency: YEARLY },
  { name: 'Pet insurance', category: 'insurance', frequency: MONTHLY },
  { name: 'Phone plan', category: 'utility', frequency: MONTHLY },
  { name: 'Internet', category: 'utility', frequency: MONTHLY },
  { name: 'Microsoft 365', category: 'software', frequency: YEARLY },
  { name: 'Adobe Creative Cloud', category: 'software', frequency: MONTHLY },
  { name: 'Dropbox', category: 'software', frequency: YEARLY },
  { name: 'Password manager', category: 'software', frequency: YEARLY },
  { name: 'VPN', category: 'software', frequency: YEARLY },
  { name: 'Antivirus', category: 'software', frequency: YEARLY },
  { name: 'Domain renewal', category: 'software', frequency: YEARLY },
  { name: 'Web hosting', category: 'software', frequency: YEARLY },
  { name: 'Credit card annual fee', category: 'card_fee', frequency: YEARLY },
  // Products with a warranty. One year is the most common manufacturer warranty.
  { name: 'Laptop', category: 'warranty', warrantyYears: 1 },
  { name: 'Phone', category: 'warranty', warrantyYears: 1 },
  { name: 'Tablet', category: 'warranty', warrantyYears: 1 },
  { name: 'TV', category: 'warranty', warrantyYears: 1 },
  { name: 'Refrigerator', category: 'warranty', warrantyYears: 1 },
  { name: 'Washing machine', category: 'warranty', warrantyYears: 1 },
  { name: 'Air conditioner', category: 'warranty', warrantyYears: 1 },
  { name: 'Dishwasher', category: 'warranty', warrantyYears: 1 },
  { name: 'Microwave', category: 'warranty', warrantyYears: 1 },
  { name: 'Vacuum cleaner', category: 'warranty', warrantyYears: 1 },
  { name: 'Water purifier', category: 'warranty', warrantyYears: 1 },
  { name: 'Headphones', category: 'warranty', warrantyYears: 1 },
  { name: 'Smartwatch', category: 'warranty', warrantyYears: 1 },
  { name: 'Camera', category: 'warranty', warrantyYears: 1 },
  { name: 'Printer', category: 'warranty', warrantyYears: 1 },
];

/** Shown before the user types anything. */
export const POPULAR_TEMPLATES: readonly ItemTemplate[] = [
  'Netflix',
  'Spotify',
  'Amazon Prime',
  'Costco',
  'Phone plan',
  'Internet',
  'Car insurance',
  'Gym membership',
  'Laptop',
].map((name) => TEMPLATES.find((t) => t.name === name)!);

/** Templates matching what the user typed, best match first. */
export function findTemplates(query: string, limit = 5): ItemTemplate[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  return TEMPLATES.map((template) => ({ template, score: matchScore(normalize(template.name), q) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || a.template.name.localeCompare(b.template.name))
    .slice(0, limit)
    .map((m) => m.template);
}

function matchScore(name: string, query: string): number {
  if (name === query) return 4;
  if (name.startsWith(query)) return 3;
  if (name.split(' ').some((word) => word.startsWith(query))) return 2;
  return name.includes(query) ? 1 : 0;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+ ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
