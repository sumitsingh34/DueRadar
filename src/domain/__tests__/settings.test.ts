import {
  DEFAULT_SETTINGS,
  describeReminderDays,
  formatHour,
  normalizeReminderDays,
  reminderDayLabel,
  settingsFromRows,
} from '@/domain/settings';

describe('settingsFromRows', () => {
  it('reads stored JSON values', () => {
    const settings = settingsFromRows([
      { key: 'currency', value: '"INR"' },
      { key: 'remindersEnabled', value: 'false' },
      { key: 'reminderDays', value: '[1, 30, 7, 7]' },
      { key: 'reminderHour', value: '20' },
    ]);
    expect(settings).toEqual({
      currency: 'INR',
      remindersEnabled: false,
      reminderDays: [30, 7, 1],
      reminderHour: 20,
    });
  });

  it('falls back to defaults for missing, corrupt or invalid values', () => {
    expect(settingsFromRows([])).toEqual(DEFAULT_SETTINGS);
    expect(
      settingsFromRows([
        { key: 'currency', value: '"rupees"' },
        { key: 'remindersEnabled', value: '{not json' },
        { key: 'reminderHour', value: '25' },
      ]),
    ).toEqual(DEFAULT_SETTINGS);
  });
});

describe('formatHour', () => {
  it('uses a 12-hour clock', () => {
    expect([0, 9, 12, 18].map(formatHour)).toEqual(['12 AM', '9 AM', '12 PM', '6 PM']);
  });
});

describe('reminder days', () => {
  it('labels and describes them', () => {
    expect([180, 90, 30, 1, 0].map(reminderDayLabel)).toEqual(['6 months', '3 months', '30 days', '1 day', 'On the day']);
    expect(describeReminderDays([30, 7, 1])).toBe('30 days, 7 days and 1 day before');
    expect(describeReminderDays([1, 0])).toBe('1 day before and on the day');
    expect(describeReminderDays([0])).toBe('On the day');
    expect(describeReminderDays([90])).toBe('3 months before');
    expect(describeReminderDays([])).toBe('No reminders');
  });

  it('cleans up untrusted lists', () => {
    expect(normalizeReminderDays([1, 30, 30, -1, 2.5, '7', 400, 0])).toEqual([30, 1, 0]);
    expect(normalizeReminderDays([])).toEqual([]);
    expect(normalizeReminderDays('30')).toBeNull();
    expect(normalizeReminderDays(null)).toBeNull();
  });
});
