import type { CategoryId } from './categories';
import type { IntervalUnit } from './dates';

/**
 * How an item's key date behaves:
 * - recurring: renews every interval (subscriptions, insurance, maintenance)
 * - expiry: a single date that passes once (warranties, passports)
 * - usage: due after a usage amount, e.g. an oil change every 5,000 mi (V3)
 */
export type ScheduleType = 'recurring' | 'expiry' | 'usage';

export type ItemStatus = 'active' | 'paused' | 'cancelled';

export interface Item {
  id: number;
  name: string;
  category: CategoryId;
  scheduleType: ScheduleType;
  /** Cost per renewal (recurring) or price paid (expiry), in cents. */
  amountCents: number | null;
  currency: string;
  intervalUnit: IntervalUnit | null;
  intervalCount: number | null;
  startDate: string | null;
  /**
   * Recurring: the renewal date the user entered. Later renewals are computed
   * from it. Expiry: the expiry date.
   */
  dueDate: string | null;
  usageInterval: number | null;
  usageUnit: string | null;
  nextUsage: number | null;
  autoRenew: boolean;
  status: ItemStatus;
  /** Company, retailer or issuer. */
  provider: string | null;
  notes: string | null;
  /** Category-specific fields, e.g. a vehicle's plate number (V3). */
  details: Record<string, unknown>;
  /** Groups items under another, e.g. a car's registration and insurance. */
  parentId: number | null;
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
  | 'dueDate'
  | 'autoRenew'
  | 'status'
  | 'provider'
  | 'notes'
>;

export interface PricePoint {
  id: number;
  itemId: number;
  amountCents: number;
  currency: string;
  effectiveDate: string;
}
