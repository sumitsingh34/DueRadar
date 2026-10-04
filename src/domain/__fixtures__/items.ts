import type { Item } from '@/domain/types';

let nextId = 1;

/** A valid active monthly subscription, with any fields overridden. */
export function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: nextId++,
    name: 'Item',
    category: 'subscription',
    scheduleType: 'recurring',
    amountCents: 1000,
    currency: 'USD',
    intervalUnit: 'month',
    intervalCount: 1,
    startDate: null,
    dueDate: '2026-10-10',
    usageInterval: null,
    usageUnit: null,
    nextUsage: null,
    autoRenew: true,
    status: 'active',
    provider: null,
    notes: null,
    details: {},
    parentId: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}
