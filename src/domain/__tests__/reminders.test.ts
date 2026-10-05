import { makeItem, makeTask } from '@/domain/__fixtures__/items';
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

describe('planReminders for tasks', () => {
  const usage = (perDay: number | null, readingDate = '2026-10-03') =>
    new Map([[1, { unit: 'km' as const, reading: 45000, readingDate, perDay }]]);

  it('reminds before the date, once, with the distance', () => {
    const task = makeTask({ dueDate: '2026-11-15', usageInterval: 10000, nextUsage: 50000 });
    const plan = planReminders([task], SETTINGS, NOW, usage(null));
    expect(plan.map((r) => r.title)).toEqual([
      'Oil change is due in 30 days',
      'Oil change is due in 7 days',
      'Oil change is due tomorrow',
    ]);
    expect(plan[0].body).toContain('at 50,000 km');
  });

  it('reminds before the date the distance is expected to be reached, when sooner', () => {
    // 5,000 km left at 250 km a day: Oct 23.
    const plan = planReminders([makeTask()], SETTINGS, NOW, usage(250));
    expect(plan.map((r) => [r.title, r.dueDate])).toEqual([
      ['Oil change is due in about 7 days', '2026-10-23'],
      ['Oil change is due in about a day', '2026-10-23'],
    ]);
    expect(plan[0].body).toContain('around');
  });

  it('falls back to the date once an estimate has passed, and skips overdue tasks', () => {
    const stale = planReminders([makeTask({ dueDate: '2026-11-15' })], SETTINGS, NOW, usage(250, '2026-06-01'));
    expect(stale.map((r) => r.dueDate)).toEqual(['2026-11-15', '2026-11-15', '2026-11-15']);
    expect(planReminders([makeTask({ nextUsage: 44000 })], SETTINGS, NOW, usage(null))).toEqual([]);
    expect(planReminders([makeTask({ dueDate: '2026-10-01' })], SETTINGS, NOW, usage(null))).toEqual([]);
  });
});

describe('planReminders with an item’s own reminders', () => {
  it('uses them instead of the settings', () => {
    const lease = makeItem({
      name: 'Apartment lease',
      category: 'lease',
      scheduleType: 'expiry',
      intervalUnit: null,
      intervalCount: null,
      dueDate: '2027-01-31',
      reminderDays: [90, 60, 30],
    });
    expect(planReminders([lease], SETTINGS, NOW).map((r) => [r.title, r.daysBefore])).toEqual([
      ['Apartment lease ends in 90 days', 90],
      ['Apartment lease ends in 60 days', 60],
      ['Apartment lease ends in 30 days', 30],
    ]);
  });

  it('still reminds when the settings have no days, and not at all for an empty list', () => {
    const item = makeItem({ intervalUnit: 'year', autoRenew: false, dueDate: '2026-11-01', reminderDays: [7] });
    expect(planReminders([item], { ...SETTINGS, reminderDays: [] }, NOW)).toHaveLength(1);
    expect(planReminders([{ ...item, reminderDays: [] }], SETTINGS, NOW)).toEqual([]);
  });

  it('reminds early enough on the day of an appointment, with its time', () => {
    const dentist = makeItem({
      name: 'Dentist',
      category: 'appointment',
      scheduleType: 'expiry',
      intervalUnit: null,
      intervalCount: null,
      amountCents: null,
      provider: 'Dr. Lee',
      dueDate: '2026-10-08',
      dueTime: '08:30',
      reminderDays: [1, 0],
    });
    const plan = planReminders([dentist], SETTINGS, NOW);
    expect(plan.map((r) => [r.title.replace(/\s/g, ' '), r.fireAt.getTime()])).toEqual([
      ['Dentist tomorrow at 8:30 AM', at(2026, 10, 7)],
      ['Dentist today at 8:30 AM', new Date(2026, 9, 8, 7, 30).getTime()],
    ]);
    expect(plan[0].body).toContain('Dr. Lee');
    // An afternoon appointment keeps the usual reminder time.
    const later = planReminders([{ ...dentist, dueTime: '15:00' }], SETTINGS, NOW);
    expect(later[1].fireAt.getTime()).toBe(at(2026, 10, 8));
  });

  it('does not remind about past appointments', () => {
    const past = makeItem({
      category: 'appointment',
      scheduleType: 'expiry',
      intervalUnit: null,
      intervalCount: null,
      dueDate: '2026-10-01',
    });
    expect(planReminders([past], SETTINGS, NOW)).toEqual([]);
  });

  it('words rent as due, even when it repeats automatically', () => {
    const rent = makeItem({ name: 'Rent', category: 'lease', dueDate: '2026-10-20' });
    expect(planReminders([rent], SETTINGS, NOW)[0].title).toBe('Rent is due in 7 days');
  });
});
