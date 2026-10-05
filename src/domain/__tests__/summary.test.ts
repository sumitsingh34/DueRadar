import { makeItem, makeTask } from '@/domain/__fixtures__/items';
import { buildDashboard, dueLabel, toDueItem } from '@/domain/summary';
import type { Item } from '@/domain/types';
import type { VehicleUsage } from '@/domain/usage';

const TODAY = '2026-10-03';

const usageOf = (usage: Partial<VehicleUsage> = {}) =>
  new Map([[1, { unit: 'km' as const, reading: 45000, readingDate: TODAY, perDay: null, ...usage }]]);

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

  it('uses warranty wording for warranties', () => {
    const label = (overrides: Partial<Item>) =>
      dueLabel(
        toDueItem(
          makeItem({ category: 'warranty', scheduleType: 'expiry', intervalUnit: null, intervalCount: null, ...overrides }),
          TODAY,
        )!,
      );
    expect(label({ dueDate: '2027-10-03' })).toBe('Warranty ends in 12 months');
    expect(label({ dueDate: '2026-10-02' })).toBe('Warranty ended yesterday');
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

describe('tasks', () => {
  it('stay due until they are done, and count towards monthly costs', () => {
    const filter = makeTask({ name: 'HVAC filter', category: 'maintenance', assetId: null, nextUsage: null, usageInterval: null, intervalCount: 3, amountCents: 3000, dueDate: '2026-09-30' });
    const summary = buildDashboard([filter], TODAY);
    expect(summary.needsAttention.map((d) => d.item.name)).toEqual(['HVAC filter']);
    expect(summary.totals).toEqual([{ currency: 'USD', monthlyCents: 1000 }]);
    expect(dueLabel(summary.needsAttention[0])).toBe('Overdue by 3 days');
  });

  it('are due at their date or their distance, whichever comes first', () => {
    const label = (task: Item, usage = usageOf()) => dueLabel(toDueItem(task, TODAY, usage)!);
    expect(label(makeTask({ dueDate: '2027-01-03' }))).toBe('Due in 3 months or 5,000 km');
    expect(label(makeTask({ dueDate: '2026-10-04' }))).toBe('Due tomorrow');
    expect(label(makeTask({ nextUsage: 45000 }))).toBe('Due now');
    expect(label(makeTask({ nextUsage: 44700 }))).toBe('Overdue by 300 km');
    expect(label(makeTask({ dueDate: '2026-10-01', nextUsage: 60000 }))).toBe('Overdue by 2 days');
    expect(label(makeTask({ dueDate: '2026-10-13' }), new Map())).toBe('Due in 10 days');
  });

  it('are overdue once the odometer passes the target, even before the date', () => {
    const due = toDueItem(makeTask({ nextUsage: 44000 }), TODAY, usageOf())!;
    expect(due).toMatchObject({ overdue: true, dueDate: TODAY, estimated: false });
    expect(buildDashboard([makeTask({ nextUsage: 44000 })], TODAY, 30, usageOf()).needsAttention).toHaveLength(1);
  });

  it('move earlier when the average distance reaches the target first, without becoming overdue', () => {
    // 5,000 km left at 100 km a day: about 50 days, sooner than the date in 6 months.
    const soon = toDueItem(makeTask(), TODAY, usageOf({ perDay: 100 }))!;
    expect(soon).toMatchObject({ dueDate: '2026-11-22', daysUntil: 50, estimated: true, overdue: false });
    expect(soon.scheduledDays).toBe(180);

    // The estimate has passed, but no reading shows the target was reached.
    const stale = toDueItem(makeTask(), TODAY, usageOf({ readingDate: '2026-06-01', perDay: 100 }))!;
    expect(stale).toMatchObject({ estimated: true, overdue: false });
    expect(stale.daysUntil).toBeLessThan(0);
    const summary = buildDashboard([makeTask()], TODAY, 30, usageOf({ readingDate: '2026-06-01', perDay: 100 }));
    expect(summary.upcoming).toHaveLength(1);
    expect(summary.needsAttention).toHaveLength(0);
  });
});
