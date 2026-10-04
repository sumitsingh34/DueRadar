import { makeItem } from '@/domain/__fixtures__/items';
import { buildDashboard, dueLabel, toDueItem } from '@/domain/summary';
import type { Item } from '@/domain/types';

const TODAY = '2026-10-03';

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

  it('uses months and years for dates far away', () => {
    const label = (overrides: Partial<Item>) => dueLabel(toDueItem(makeItem(overrides), TODAY)!);
    expect(label({ dueDate: '2026-12-02', intervalUnit: 'year' })).toBe('Renews in 60 days');
    expect(label({ dueDate: '2026-12-03', intervalUnit: 'year' })).toBe('Renews in 2 months');
    expect(label({ dueDate: '2027-10-03', intervalUnit: 'year' })).toBe('Renews in 12 months');
    expect(label({ dueDate: '2036-10-03', scheduleType: 'expiry' })).toBe('Expires in 10 years');
    expect(label({ dueDate: '2026-07-01', autoRenew: false })).toBe('Overdue by 3 months');
    expect(label({ dueDate: '2025-01-01', scheduleType: 'expiry' })).toBe('Expired 21 months ago');
  });
});
