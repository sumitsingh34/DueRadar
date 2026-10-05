import type { AssetKind, ScheduleType } from './types';

export type CategoryId =
  | 'subscription'
  | 'membership'
  | 'insurance'
  | 'utility'
  | 'software'
  | 'card_fee'
  | 'lease'
  | 'tax'
  | 'warranty'
  | 'maintenance'
  | 'vehicle'
  | 'license'
  | 'appointment'
  | 'document'
  | 'other';

export type CategoryGroup = 'bills' | 'things' | 'life';

export interface Category {
  id: CategoryId;
  label: string;
  /** Product version that introduces this category in the UI. */
  phase: 1 | 2 | 3 | 4 | 5;
  group: CategoryGroup;
  /** Schedule types offered in the form, the usual one first. */
  schedules: readonly ScheduleType[];
  color: string;
  /**
   * How a recurring date is worded: "renews" for a subscription (the
   * default), or "due" for a payment such as rent or a tax return.
   */
  recurringWord?: 'renews' | 'due';
  /** Wording for this category where it differs from the defaults. */
  wording?: {
    /** Label for the start date field, which is only shown when this is set. */
    startDate?: string;
    /** Label for the company field. */
    provider?: string;
    /** Placeholder for the company field. */
    providerPlaceholder?: string;
    /** "Expires" for a date to come, e.g. "Warranty ends". Empty for an appointment: "In 3 days". */
    expires?: string;
    /** "Expired" for a date that has passed, e.g. "Warranty ended". Empty for an appointment: "3 days ago". */
    expired?: string;
    /** Label for a one-time date field. Defaults to `expires`, then "Expiry date". */
    dueDate?: string;
    /** Label for the length shortcuts, e.g. "Warranty length". */
    length?: string;
    /** Names for the schedule types where the defaults don't fit, e.g. "One time" for an appointment. */
    schedules?: Partial<Record<ScheduleType, string>>;
  };
  /** Length shortcuts in years for a one-time date, which set it from the start date. */
  lengthYears?: readonly number[];
  /** Whether a one-time date can have a time of day, like an appointment. */
  time?: boolean;
  /**
   * Whether a one-time date is simply over once it has passed, like an
   * appointment, rather than something that needs attention.
   */
  pastIsDone?: boolean;
  /** Reminders suggested for new items, by schedule type, e.g. 90, 60 and 30 days before a lease ends. */
  reminderDays?: Partial<Record<ScheduleType, readonly number[]>>;
  /** Whether items in this category can have a receipt photo. */
  receipts?: boolean;
  /** Whether items in this category can have photos of the document, kept encrypted. */
  documentPhotos?: boolean;
  /** Whether a one-time item can have no date at all, like a birth certificate. */
  dateOptional?: boolean;
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
export const CURRENT_PHASE = 5;

/** Category groups, in the order the form shows them. */
export const CATEGORY_GROUPS: readonly { id: CategoryGroup; label: string }[] = [
  { id: 'bills', label: 'Bills and renewals' },
  { id: 'things', label: 'Your things' },
  { id: 'life', label: 'Life admin' },
];

const RENEWS: readonly ScheduleType[] = ['recurring', 'expiry'];

export const CATEGORIES: readonly Category[] = [
  { id: 'subscription', label: 'Subscription', phase: 1, group: 'bills', schedules: RENEWS, color: '#208AEF' },
  { id: 'membership', label: 'Membership', phase: 1, group: 'bills', schedules: RENEWS, color: '#8E4EC6' },
  {
    id: 'insurance',
    label: 'Insurance',
    phase: 1,
    group: 'bills',
    schedules: RENEWS,
    color: '#12A594',
    assets: { kinds: ['vehicle', 'home'], offerNew: false },
  },
  { id: 'utility', label: 'Phone & internet', phase: 1, group: 'bills', schedules: RENEWS, color: '#F76B15' },
  { id: 'software', label: 'Software & domains', phase: 1, group: 'bills', schedules: RENEWS, color: '#3E63DD' },
  { id: 'card_fee', label: 'Card annual fee', phase: 1, group: 'bills', schedules: RENEWS, color: '#E5484D' },
  {
    id: 'lease',
    label: 'Lease & rent',
    phase: 4,
    group: 'bills',
    schedules: RENEWS,
    color: '#E2A336',
    recurringWord: 'due',
    wording: {
      startDate: 'Start date',
      provider: 'Landlord or company',
      providerPlaceholder: 'Who you pay',
      expires: 'Ends',
      expired: 'Ended',
      dueDate: 'End date',
      schedules: { recurring: 'Repeats', expiry: 'Ends once' },
    },
    reminderDays: { expiry: [90, 60, 30] },
    assets: { kinds: ['home', 'vehicle'], offerNew: false },
  },
  {
    id: 'tax',
    label: 'Taxes',
    phase: 4,
    group: 'bills',
    schedules: RENEWS,
    color: '#978365',
    recurringWord: 'due',
    wording: {
      provider: 'Paid to',
      providerPlaceholder: 'Tax office, accountant…',
      dueDate: 'Due date',
      expires: 'Due',
      expired: 'Was due',
      schedules: { recurring: 'Repeats', expiry: 'Once' },
    },
    assets: { kinds: ['home', 'vehicle'], offerNew: false },
  },
  {
    id: 'warranty',
    label: 'Warranty',
    phase: 2,
    group: 'things',
    schedules: ['expiry', 'recurring'],
    color: '#AD7F58',
    wording: {
      startDate: 'Purchase date',
      provider: 'Store',
      providerPlaceholder: 'Where you bought it',
      expires: 'Warranty ends',
      expired: 'Warranty ended',
      length: 'Warranty length',
    },
    lengthYears: [1, 2, 3, 5],
    receipts: true,
  },
  {
    id: 'maintenance',
    label: 'Home maintenance',
    phase: 3,
    group: 'things',
    schedules: ['task', 'expiry'],
    color: '#46A758',
    wording: { provider: 'Service company', providerPlaceholder: 'Who does it' },
    assets: { kinds: ['home'], offerNew: true },
  },
  {
    id: 'vehicle',
    label: 'Vehicle',
    phase: 3,
    group: 'things',
    schedules: ['task', 'recurring', 'expiry'],
    color: '#00A2C7',
    wording: { provider: 'Garage or company', providerPlaceholder: 'Who does it' },
    assets: { kinds: ['vehicle'], offerNew: true },
  },
  {
    id: 'license',
    label: 'License & certification',
    phase: 4,
    group: 'life',
    schedules: ['expiry', 'recurring'],
    color: '#D6409F',
    wording: {
      startDate: 'Issue date',
      provider: 'Issued by',
      providerPlaceholder: 'Licensing office, board…',
      length: 'Valid for',
    },
    lengthYears: [1, 2, 3, 5, 10],
    reminderDays: { expiry: [60, 30, 7], recurring: [60, 30, 7] },
  },
  {
    id: 'appointment',
    label: 'Appointment',
    phase: 4,
    group: 'life',
    schedules: ['expiry', 'task'],
    color: '#AB4ABA',
    wording: {
      provider: 'With or where',
      providerPlaceholder: 'Doctor, clinic, office…',
      expires: '',
      expired: '',
      dueDate: 'Date',
      schedules: { expiry: 'One time', task: 'Regular checkup' },
    },
    time: true,
    pastIsDone: true,
    reminderDays: { expiry: [1, 0] },
  },
  {
    id: 'document',
    label: 'Document',
    phase: 5,
    group: 'life',
    schedules: ['expiry'],
    color: '#6E56CF',
    wording: {
      startDate: 'Issue date',
      provider: 'Issued by',
      providerPlaceholder: 'Country or office',
      length: 'Valid for',
    },
    lengthYears: [1, 5, 10],
    // Many countries want a passport valid for 6 months beyond a trip.
    reminderDays: { expiry: [180, 90, 30] },
    documentPhotos: true,
    dateOptional: true,
  },
  {
    id: 'other',
    label: 'Other',
    phase: 1,
    group: 'life',
    schedules: ['recurring', 'task', 'expiry'],
    color: '#8B8D98',
  },
];

export const AVAILABLE_CATEGORIES = CATEGORIES.filter((c) => c.phase <= CURRENT_PHASE);

const OTHER = CATEGORIES.find((c) => c.id === 'other')!;

export function getCategory(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? OTHER;
}

const SCHEDULE_LABELS: Record<ScheduleType, string> = {
  recurring: 'Renews',
  task: 'Repeats when done',
  expiry: 'Expires once',
};

/** How a schedule type is named for a category, e.g. "Renews" or "One time". */
export function scheduleLabel(category: Category, schedule: ScheduleType): string {
  return category.wording?.schedules?.[schedule] ?? SCHEDULE_LABELS[schedule];
}

/** Wording around a recurring date: a renewal (a subscription) or a payment that's due (rent, taxes). */
export function recurringWording(category: Category) {
  const due = category.recurringWord === 'due';
  return {
    verb: due ? 'Due' : 'Renews',
    dateLabel: due ? 'Next due date' : 'Next renewal date',
    costLabel: due ? 'Amount each time' : 'Cost per renewal',
    autoLabel: due ? 'Repeats automatically' : 'Renews automatically',
    autoOn: due ? 'The due date moves forward on its own.' : 'The renewal date moves forward on its own.',
    autoOff: due ? 'Shown as overdue until you mark it done.' : 'Shown as overdue until you mark it renewed.',
    confirm: due ? 'Mark as done' : 'Mark as renewed',
    history: due ? 'Done' : 'Renewed',
  };
}
