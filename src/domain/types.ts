import type { CategoryId } from './categories';
import type { IntervalUnit } from './dates';

/**
 * How an item's key date behaves:
 * - recurring: renews on a fixed schedule (subscriptions, insurance, registration)
 * - task: due again a set time after it's done, and optionally after a distance
 *   (an oil change every 6 months or 10,000 km)
 * - expiry: a single date that passes once (warranties, passports)
 */
export type ScheduleType = 'recurring' | 'task' | 'expiry';

export type ItemStatus = 'active' | 'paused' | 'cancelled';

export type DistanceUnit = 'km' | 'mi';

export interface Item {
  id: number;
  name: string;
  category: CategoryId;
  scheduleType: ScheduleType;
  /** Cost per renewal or per time it's done, or the price paid (expiry), in cents. */
  amountCents: number | null;
  currency: string;
  intervalUnit: IntervalUnit | null;
  intervalCount: number | null;
  startDate: string | null;
  /**
   * Recurring: the renewal date the user entered. Later renewals are computed
   * from it. Task: when it's next due. Expiry: the expiry date.
   */
  dueDate: string | null;
  /** Time of day of a one-time date, such as an appointment, as `HH:MM`. */
  dueTime: string | null;
  /** Days before the date to remind, overriding the settings. Null follows the settings. */
  reminderDays: number[] | null;
  /** Task: distance between services, e.g. 10000 (km). Needs a vehicle. */
  usageInterval: number | null;
  usageUnit: DistanceUnit | null;
  /** Task: the odometer reading at which it's next due. */
  nextUsage: number | null;
  autoRenew: boolean;
  status: ItemStatus;
  /** Company, retailer or issuer. */
  provider: string | null;
  notes: string | null;
  /** Category-specific fields. */
  details: Record<string, unknown>;
  /** Not used yet. Reserved for grouping items under another item. */
  parentId: number | null;
  /** The vehicle or home this item belongs to. */
  assetId: number | null;
  createdAt: string;
  updatedAt: string;
}

/** The fields a user can edit in the item form. */
export type ItemInput = Pick<
  Item,
  | 'name'
  | 'category'
  | 'scheduleType'
  | 'amountCents'
  | 'currency'
  | 'intervalUnit'
  | 'intervalCount'
  | 'startDate'
  | 'dueDate'
  | 'dueTime'
  | 'reminderDays'
  | 'usageInterval'
  | 'usageUnit'
  | 'nextUsage'
  | 'autoRenew'
  | 'status'
  | 'provider'
  | 'notes'
  | 'assetId'
>;

/**
 * A file attached to an item, stored in the app's own folder: a receipt photo,
 * or a photo of a document, which is kept encrypted.
 */
export interface Attachment {
  id: number;
  itemId: number;
  kind: 'receipt' | 'document';
  /** Path relative to the app's document folder, e.g. "receipts/12-1730000000000.jpg". */
  path: string;
  mimeType: string | null;
  /** Whether the file is encrypted with the vault key. */
  encrypted: boolean;
  createdAt: string;
}

export interface PricePoint {
  id: number;
  itemId: number;
  amountCents: number;
  currency: string;
  effectiveDate: string;
}

export type AssetKind = 'vehicle' | 'home';

/** Something items can belong to, such as a car (with its odometer) or a home. */
export interface Asset {
  id: number;
  name: string;
  kind: AssetKind;
  /** A vehicle's odometer unit. Null for homes. */
  usageUnit: DistanceUnit | null;
  /** Kind-specific fields, e.g. `{ plate: 'ABC-1234' }` for a vehicle. */
  details: Record<string, unknown>;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AssetInput = Pick<Asset, 'name' | 'kind' | 'usageUnit' | 'details' | 'notes'>;

/** An odometer reading for a vehicle. */
export interface UsageReading {
  id: number;
  assetId: number;
  reading: number;
  date: string;
}

/** One time a task was done, or a renewal was confirmed. */
export interface Completion {
  id: number;
  itemId: number;
  date: string;
  amountCents: number | null;
  currency: string | null;
  /** The odometer reading at the time, for vehicle tasks. */
  usage: number | null;
  note: string | null;
}
