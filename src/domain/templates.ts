import type { CategoryId } from './categories';
import type { Frequency } from './frequency';
import type { DistanceUnit, ScheduleType } from './types';

/**
 * Quick-add presets: something that renews, a task that repeats when done,
 * or a one-time date such as a warranty, a lease end or an appointment.
 * Prices are left out on purpose: they differ by country and plan, and they
 * change often.
 */
export interface ItemTemplate {
  name: string;
  category: CategoryId;
  /** How often it renews or is done. One-time items have none. */
  frequency?: Frequency;
  /** Repeats a set time after it's done, instead of renewing on a fixed schedule. */
  task?: true;
  /** Vehicle tasks: the usual distance between services, in each unit. */
  distance?: Readonly<Record<DistanceUnit, number>>;
  /** A renewal you confirm yourself, such as a registration. Renewals are automatic otherwise. */
  autoRenew?: false;
  /** Warranties: the usual length in years. */
  warrantyYears?: number;
}

const MONTHLY: Frequency = { unit: 'month', count: 1 };
const QUARTERLY: Frequency = { unit: 'month', count: 3 };
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
  // Home maintenance: common intervals, which the user can change.
  { name: 'HVAC filter', category: 'maintenance', frequency: QUARTERLY, task: true },
  { name: 'AC service', category: 'maintenance', frequency: YEARLY, task: true },
  { name: 'Furnace service', category: 'maintenance', frequency: YEARLY, task: true },
  { name: 'Pest control', category: 'maintenance', frequency: QUARTERLY, task: true },
  { name: 'Water purifier service', category: 'maintenance', frequency: HALF_YEARLY, task: true },
  { name: 'Water filter', category: 'maintenance', frequency: HALF_YEARLY, task: true },
  { name: 'Water tank cleaning', category: 'maintenance', frequency: HALF_YEARLY, task: true },
  { name: 'Smoke alarm batteries', category: 'maintenance', frequency: YEARLY, task: true },
  { name: 'Gutter cleaning', category: 'maintenance', frequency: HALF_YEARLY, task: true },
  { name: 'Water heater flush', category: 'maintenance', frequency: YEARLY, task: true },
  { name: 'Chimney sweep', category: 'maintenance', frequency: YEARLY, task: true },
  { name: 'Dryer vent cleaning', category: 'maintenance', frequency: YEARLY, task: true },
  { name: 'Fire extinguisher check', category: 'maintenance', frequency: YEARLY, task: true },
  { name: 'Septic tank pumping', category: 'maintenance', frequency: { unit: 'year', count: 3 }, task: true },
  // Vehicles: whichever comes first, the time or the distance.
  {
    name: 'Oil change',
    category: 'vehicle',
    frequency: HALF_YEARLY,
    task: true,
    distance: { km: 10000, mi: 5000 },
  },
  {
    name: 'Tire rotation',
    category: 'vehicle',
    frequency: HALF_YEARLY,
    task: true,
    distance: { km: 10000, mi: 6000 },
  },
  { name: 'Car service', category: 'vehicle', frequency: YEARLY, task: true, distance: { km: 15000, mi: 10000 } },
  { name: 'Bike service', category: 'vehicle', frequency: QUARTERLY, task: true, distance: { km: 3000, mi: 2000 } },
  { name: 'Brake check', category: 'vehicle', frequency: YEARLY, task: true, distance: { km: 20000, mi: 12000 } },
  { name: 'Wheel alignment', category: 'vehicle', frequency: YEARLY, task: true, distance: { km: 10000, mi: 6000 } },
  { name: 'Battery check', category: 'vehicle', frequency: YEARLY, task: true },
  { name: 'Wiper blades', category: 'vehicle', frequency: YEARLY, task: true },
  { name: 'Emissions test', category: 'vehicle', frequency: YEARLY, task: true },
  { name: 'Vehicle registration', category: 'vehicle', frequency: YEARLY, autoRenew: false },
  { name: 'Vehicle inspection', category: 'vehicle', frequency: YEARLY, autoRenew: false },
  // Leases and rent. A lease end is a single date; rent repeats.
  { name: 'Rent', category: 'lease', frequency: MONTHLY },
  { name: 'Apartment lease', category: 'lease' },
  { name: 'Car lease', category: 'lease' },
  { name: 'Storage unit', category: 'lease', frequency: MONTHLY },
  { name: 'Parking', category: 'lease', frequency: MONTHLY },
  { name: 'HOA fees', category: 'lease', frequency: MONTHLY },
  // Taxes, which you mark as done each time.
  { name: 'Income tax return', category: 'tax', frequency: YEARLY, autoRenew: false },
  { name: 'Property tax', category: 'tax', frequency: YEARLY, autoRenew: false },
  { name: 'Estimated tax', category: 'tax', frequency: QUARTERLY, autoRenew: false },
  { name: 'Advance tax', category: 'tax', frequency: QUARTERLY, autoRenew: false },
  { name: 'Road tax', category: 'tax', frequency: YEARLY, autoRenew: false },
  // Licenses and certifications: the expiry date is on the card.
  { name: "Driver's license", category: 'license' },
  { name: 'Professional license', category: 'license' },
  { name: 'Certification', category: 'license' },
  { name: 'CPR certification', category: 'license' },
  { name: 'First aid certificate', category: 'license' },
  { name: 'Business license', category: 'license', frequency: YEARLY, autoRenew: false },
  { name: 'Fishing license', category: 'license', frequency: YEARLY, autoRenew: false },
  { name: 'Pet license', category: 'license', frequency: YEARLY, autoRenew: false },
  // Appointments, and checkups that repeat after each visit.
  { name: 'Doctor appointment', category: 'appointment' },
  { name: 'Dentist appointment', category: 'appointment' },
  { name: 'Dental checkup', category: 'appointment', frequency: HALF_YEARLY, task: true },
  { name: 'Eye exam', category: 'appointment', frequency: YEARLY, task: true },
  { name: 'Health checkup', category: 'appointment', frequency: YEARLY, task: true },
  { name: 'Pet vaccination', category: 'appointment', frequency: YEARLY, task: true },
  { name: 'Haircut', category: 'appointment', frequency: MONTHLY, task: true },
];

/** Shown before the user types anything: a few from each kind of item. */
export const POPULAR_TEMPLATES: readonly ItemTemplate[] = [
  'Netflix',
  'Spotify',
  'Amazon Prime',
  'Phone plan',
  'Internet',
  'Car insurance',
  'Rent',
  'Laptop',
  'Oil change',
  'AC service',
  "Driver's license",
  'Dental checkup',
].map((name) => TEMPLATES.find((t) => t.name === name)!);

/** The kind of schedule a template sets up. */
export function templateSchedule(template: ItemTemplate): ScheduleType {
  if (!template.frequency) return 'expiry';
  return template.task ? 'task' : 'recurring';
}

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
