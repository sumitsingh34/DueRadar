import type { Asset, Item } from '@/domain/types';

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
    dueTime: null,
    reminderDays: null,
    usageInterval: null,
    usageUnit: null,
    nextUsage: null,
    autoRenew: true,
    status: 'active',
    provider: null,
    notes: null,
    details: {},
    parentId: null,
    assetId: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

/** A task done every 6 months or 10,000 km, belonging to vehicle 1, with any fields overridden. */
export function makeTask(overrides: Partial<Item> = {}): Item {
  return makeItem({
    name: 'Oil change',
    category: 'vehicle',
    scheduleType: 'task',
    amountCents: 4500,
    intervalUnit: 'month',
    intervalCount: 6,
    autoRenew: false,
    dueDate: '2027-04-01',
    usageInterval: 10000,
    usageUnit: 'km',
    nextUsage: 50000,
    assetId: 1,
    ...overrides,
  });
}

/** Vehicle 1, measured in km, with any fields overridden. */
export function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 1,
    name: 'Honda Civic',
    kind: 'vehicle',
    usageUnit: 'km',
    details: {},
    notes: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}
