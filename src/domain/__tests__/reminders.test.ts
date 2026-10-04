import { makeItem } from '@/domain/__fixtures__/items';
import { MAX_SCHEDULED, planReminders } from '@/domain/reminders';

// Oct 3, 2026, 10:00 local time.
const NOW = new Date(2026, 9, 3, 10, 0);
const SETTINGS = { remindersEnabled: true, reminderDays: [30, 7, 1], reminderHour: 9 };

const at = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h).getTime();

describe('planReminders', () => {
  it('skips reminders as long as the billing period and repeats for auto-renewals', () => {
    const netflix = makeItem({ name: 'Netflix', dueDate: '2026-10-18', amountCents: 1549 });
    const plan = planReminders([netflix], SETTINGS, NOW);

    expect(plan.slice(0, 3).map((r) => [r.title, r.fireAt.getTime()])).toEqual([
      ['Netflix renews in 7 days', at(2026, 10, 11)],
      ['Netflix renews tomorrow', at(2026, 10, 17)],
      ['Netflix renews in 7 days', at(2026, 11, 11)],
    ]);
    expect(plan.some((r) => r.daysBefore === 30)).toBe(false);
    expect(plan[0].body).toContain('$15.49');
  });

  it('uses every offset for yearly items', () => {
    const costco = makeItem({ name: 'Costco', intervalUnit: 'year', dueDate: '2026-11-04' });
    const plan = planReminders([costco], SETTINGS, NOW);
    expect(plan.slice(0, 3).map((r) => r.fireAt.getTime())).toEqual([
      at(2026, 10, 5),
      at(2026, 10, 28),
      at(2026, 11, 3),
    ]);
  });

  it('leaves out reminders whose time has passed', () => {
    const item = makeItem({ intervalUnit: 'year', dueDate: '2026-10-04' });
    const plan = planReminders([item], { ...SETTINGS, reminderDays: [1, 0] }, NOW);
    // The "1 day before" reminder was due at 9:00 today, before 10:00 now.
    expect(plan[0].fireAt.getTime()).toBe(at(2026, 10, 4));
  });

  it('does not repeat manual renewals or expiries, and skips overdue or inactive items', () => {
    const items = [
      makeItem({ name: 'Domain', intervalUnit: 'year', autoRenew: false, dueDate: '2026-12-01' }),
      makeItem({ name: 'Overdue', autoRenew: false, dueDate: '2026-09-01' }),
      makeItem({ name: 'Paused', status: 'paused', dueDate: '2026-10-20' }),
      makeItem({
        name: 'Passport',
        scheduleType: 'expiry',
        intervalUnit: null,
        intervalCount: null,
        amountCents: null,
        dueDate: '2026-11-15',
      }),
    ];
    const plan = planReminders(items, SETTINGS, NOW);
    expect(plan.map((r) => r.title)).toEqual([
      'Passport expires in 30 days', // Oct 16
      'Domain is due in 30 days', // Nov 1
      'Passport expires in 7 days', // Nov 8
      'Passport expires tomorrow', // Nov 14
      'Domain is due in 7 days', // Nov 24
      'Domain is due tomorrow', // Nov 30
    ]);
  });

  it('words warranty reminders as the warranty ending', () => {
    const laptop = makeItem({
      name: 'Laptop',
      category: 'warranty',
      scheduleType: 'expiry',
      intervalUnit: null,
      intervalCount: null,
      dueDate: '2026-11-15',
    });
    expect(planReminders([laptop], SETTINGS, NOW)[0].title).toBe('Laptop warranty ends in 30 days');
  });

  it('returns nothing when reminders are off', () => {
    expect(planReminders([makeItem({})], { ...SETTINGS, remindersEnabled: false }, NOW)).toEqual([]);
  });

  it('caps the number of scheduled reminders, soonest first', () => {
    const items = Array.from({ length: 20 }, (_, i) =>
      makeItem({ intervalUnit: 'week', dueDate: `2026-10-${String(5 + (i % 7)).padStart(2, '0')}` }),
    );
    const plan = planReminders(items, { ...SETTINGS, reminderDays: [3, 1, 0] }, NOW);
    expect(plan).toHaveLength(MAX_SCHEDULED);
    const times = plan.map((r) => r.fireAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});
