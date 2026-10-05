import type { AssetKind, ScheduleType } from './types';

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
  /** Schedule types offered in the form, the usual one first. */
  schedules: readonly ScheduleType[];
  color: string;
  /** Wording for this category where it differs from the defaults. */
  wording?: {
    /** Label for the start date field, which is only shown when this is set. */
    startDate?: string;
    /** Label for the company field. */
    provider?: string;
    /** Placeholder for the company field. */
    providerPlaceholder?: string;
    /** "Expires" for a date to come, e.g. "Warranty ends". */
    expires?: string;
    /** "Expired" for a date that has passed, e.g. "Warranty ended". */
    expired?: string;
  };
  /** Whether items in this category can have a receipt photo. */
  receipts?: boolean;
  /** The vehicles or homes items in this category can belong to. */
  assets?: {
    kinds: readonly AssetKind[];
    /**
     * Whether the form offers to add a new one. Otherwise the choice only
     * appears once the user has a vehicle or home of these kinds.
     */
    offerNew: boolean;
  };
}

/** Categories from later roadmap versions stay hidden until that version ships. */
export const CURRENT_PHASE = 3;

export const CATEGORIES: readonly Category[] = [
  { id: 'subscription', label: 'Subscription', phase: 1, schedules: ['recurring', 'expiry'], color: '#208AEF' },
  { id: 'membership', label: 'Membership', phase: 1, schedules: ['recurring', 'expiry'], color: '#8E4EC6' },
  {
    id: 'insurance',
    label: 'Insurance',
    phase: 1,
    schedules: ['recurring', 'expiry'],
    color: '#12A594',
    assets: { kinds: ['vehicle', 'home'], offerNew: false },
  },
  { id: 'utility', label: 'Phone & internet', phase: 1, schedules: ['recurring', 'expiry'], color: '#F76B15' },
  { id: 'software', label: 'Software & domains', phase: 1, schedules: ['recurring', 'expiry'], color: '#3E63DD' },
  { id: 'card_fee', label: 'Card annual fee', phase: 1, schedules: ['recurring', 'expiry'], color: '#E5484D' },
  {
    id: 'warranty',
    label: 'Warranty',
    phase: 2,
    schedules: ['expiry', 'recurring'],
    color: '#AD7F58',
    wording: {
      startDate: 'Purchase date',
      provider: 'Store',
      providerPlaceholder: 'Where you bought it',
      expires: 'Warranty ends',
      expired: 'Warranty ended',
    },
    receipts: true,
  },
  {
    id: 'maintenance',
    label: 'Home maintenance',
    phase: 3,
    schedules: ['task', 'expiry'],
    color: '#46A758',
    wording: { provider: 'Service company', providerPlaceholder: 'Who does it' },
    assets: { kinds: ['home'], offerNew: true },
  },
  {
    id: 'vehicle',
    label: 'Vehicle',
    phase: 3,
    schedules: ['task', 'recurring', 'expiry'],
    color: '#00A2C7',
    wording: { provider: 'Garage or company', providerPlaceholder: 'Who does it' },
    assets: { kinds: ['vehicle'], offerNew: true },
  },
  { id: 'license', label: 'License & certification', phase: 4, schedules: ['expiry', 'recurring'], color: '#D6409F' },
  { id: 'document', label: 'Document', phase: 5, schedules: ['expiry'], color: '#6E56CF' },
  { id: 'other', label: 'Other', phase: 1, schedules: ['recurring', 'task', 'expiry'], color: '#8B8D98' },
];

export const AVAILABLE_CATEGORIES = CATEGORIES.filter((c) => c.phase <= CURRENT_PHASE);

const OTHER = CATEGORIES.find((c) => c.id === 'other')!;

export function getCategory(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? OTHER;
}

/** How each schedule type is named in the form. */
export const SCHEDULE_LABELS: Record<ScheduleType, string> = {
  recurring: 'Renews',
  task: 'Repeats when done',
  expiry: 'Expires once',
};
