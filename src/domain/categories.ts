import type { ScheduleType } from './types';

export type CategoryId =
  | 'subscription'
  | 'membership'
  | 'insurance'
  | 'utility'
  | 'software'
  | 'card_fee'
  | 'warranty'
  | 'maintenance'
  | 'vehicle'
  | 'license'
  | 'document'
  | 'other';

export interface Category {
  id: CategoryId;
  label: string;
  /** Product version that introduces this category in the UI. */
  phase: 1 | 2 | 3 | 4 | 5;
  defaultSchedule: ScheduleType;
  color: string;
  /** Wording for this category where it differs from the defaults. */
  wording?: {
    /** Label for the start date field, which is only shown when this is set. */
    startDate?: string;
    /** Label for the company field. */
    provider?: string;
    /** "Expires" for a date to come, e.g. "Warranty ends". */
    expires?: string;
    /** "Expired" for a date that has passed, e.g. "Warranty ended". */
    expired?: string;
  };
  /** Whether items in this category can have a receipt photo. */
  receipts?: boolean;
}

/** Categories from later roadmap versions stay hidden until that version ships. */
export const CURRENT_PHASE = 2;

export const CATEGORIES: readonly Category[] = [
  { id: 'subscription', label: 'Subscription', phase: 1, defaultSchedule: 'recurring', color: '#208AEF' },
  { id: 'membership', label: 'Membership', phase: 1, defaultSchedule: 'recurring', color: '#8E4EC6' },
  { id: 'insurance', label: 'Insurance', phase: 1, defaultSchedule: 'recurring', color: '#12A594' },
  { id: 'utility', label: 'Phone & internet', phase: 1, defaultSchedule: 'recurring', color: '#F76B15' },
  { id: 'software', label: 'Software & domains', phase: 1, defaultSchedule: 'recurring', color: '#3E63DD' },
  { id: 'card_fee', label: 'Card annual fee', phase: 1, defaultSchedule: 'recurring', color: '#E5484D' },
  {
    id: 'warranty',
    label: 'Warranty',
    phase: 2,
    defaultSchedule: 'expiry',
    color: '#AD7F58',
    wording: {
      startDate: 'Purchase date',
      provider: 'Store',
      expires: 'Warranty ends',
      expired: 'Warranty ended',
    },
    receipts: true,
  },
  { id: 'maintenance', label: 'Maintenance', phase: 3, defaultSchedule: 'recurring', color: '#46A758' },
  { id: 'vehicle', label: 'Vehicle', phase: 3, defaultSchedule: 'recurring', color: '#0090FF' },
  { id: 'license', label: 'License & certification', phase: 4, defaultSchedule: 'expiry', color: '#D6409F' },
  { id: 'document', label: 'Document', phase: 5, defaultSchedule: 'expiry', color: '#6E56CF' },
  { id: 'other', label: 'Other', phase: 1, defaultSchedule: 'recurring', color: '#8B8D98' },
];

export const AVAILABLE_CATEGORIES = CATEGORIES.filter((c) => c.phase <= CURRENT_PHASE);

export function getCategory(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}
