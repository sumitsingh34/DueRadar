import { buildDashboard, dueLabel, toDueItem } from '@/domain/summary';
import type { Item } from '@/domain/types';

const TODAY = '2026-10-03';

let nextId = 1;
function makeItem(overrides: Partial<Item>): Item {
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

describe('buildDashboard', () => {
  it('totals only active recurring costs, per month', () => {
    const summary = buildDashboard(
      [
        makeItem({ amountCents: 1549 }),
        makeItem({ amountCents: 12000, intervalUnit: 'year' }),
        makeItem({ amountCents: 999, status: 'cancelled' }),
        makeItem({ amountCents: 120000, scheduleType: 'expiry', intervalUnit: null, intervalCount: null }),
      ],
      TODAY,
    );
    expect(summary.totals).toEqual([{ currency: 'USD', monthlyCents: 1549 + 1000 }]);
    expect(summary.activeCount).toBe(3);
  });

  it('keeps currencies separate', () => {
    const summary = buildDashboard(
      [makeItem({ amountCents: 500 }), makeItem({ amountCents: 2000, currency: 'EUR' })],
      TODAY,
    );
    expect(summary.totals.map((t) => t.currency)).toEqual(['EUR', 'USD']);
  });

  it('lists what is due in the window, soonest first', () => {
    const later = makeItem({ name: 'Later', dueDate: '2026-10-30' });
    const soon = makeItem({ name: 'Soon', dueDate: '2026-10-05' });
    const outside = makeItem({ name: 'Outside', dueDate: '2026-12-01' });
    const summary = buildDashboard([later, outside, soon], TODAY);
    expect(summary.upcoming.map((d) => d.item.name)).toEqual(['Soon', 'Later']);
  });

  it('rolls auto-renewing items forward but flags manual ones as overdue', () => {
    const auto = makeItem({ name: 'Auto', dueDate: '2026-09-20' });
    const manual = makeItem({ name: 'Manual', dueDate: '2026-09-20', autoRenew: false });
    const expired = makeItem({
      name: 'Passport',
      scheduleType: 'expiry',
      dueDate: '2026-10-01',
      intervalUnit: null,
      intervalCount: null,
    });
    const summary = buildDashboard([auto, manual, expired], TODAY);
    expect(summary.upcoming.map((d) => [d.item.name, d.dueDate])).toEqual([['Auto', '2026-10-20']]);
    expect(summary.needsAttention.map((d) => d.item.name)).toEqual(['Manual', 'Passport']);
  });
});

describe('dueLabel', () => {
  it('describes upcoming and past dates', () => {
    const label = (overrides: Partial<Item>) => dueLabel(toDueItem(makeItem(overrides), TODAY)!);
    expect(label({ dueDate: TODAY })).toBe('Renews today');
    expect(label({ dueDate: '2026-10-04' })).toBe('Renews tomorrow');
    expect(label({ dueDate: '2026-10-08' })).toBe('Renews in 5 days');
    expect(label({ dueDate: '2026-10-01', autoRenew: false })).toBe('Overdue by 2 days');
    expect(label({ dueDate: '2026-10-02', scheduleType: 'expiry' })).toBe('Expired yesterday');
  });
});
