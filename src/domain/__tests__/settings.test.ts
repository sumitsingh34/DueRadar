import { DEFAULT_SETTINGS, formatHour, settingsFromRows } from '@/domain/settings';

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
