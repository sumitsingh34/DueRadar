import {
  addInterval,
  daysBetween,
  isISODate,
  nextOccurrenceOnOrAfter,
  toISODate,
} from '@/domain/dates';

describe('addInterval', () => {
  it('adds days and weeks across month and year boundaries', () => {
    expect(addInterval('2026-12-30', 'day', 3)).toBe('2027-01-02');
    expect(addInterval('2026-02-26', 'week', 1)).toBe('2026-03-05');
  });

  it('clamps to the last day of shorter months', () => {
    expect(addInterval('2026-01-31', 'month', 1)).toBe('2026-02-28');
    expect(addInterval('2028-01-31', 'month', 1)).toBe('2028-02-29');
    expect(addInterval('2026-08-31', 'month', 3)).toBe('2026-11-30');
  });

  it('handles leap days for yearly steps', () => {
    expect(addInterval('2028-02-29', 'year', 1)).toBe('2029-02-28');
    expect(addInterval('2028-02-29', 'year', 4)).toBe('2032-02-29');
  });
});

describe('nextOccurrenceOnOrAfter', () => {
  it('returns the anchor when it is still ahead', () => {
    expect(nextOccurrenceOnOrAfter('2026-11-04', 'month', 1, '2026-10-03')).toBe('2026-11-04');
  });

  it('returns the anchor on the day itself', () => {
    expect(nextOccurrenceOnOrAfter('2026-10-03', 'year', 1, '2026-10-03')).toBe('2026-10-03');
  });

  it('rolls monthly bills forward without drifting off the 31st', () => {
    expect(nextOccurrenceOnOrAfter('2026-01-31', 'month', 1, '2026-03-01')).toBe('2026-03-31');
    expect(nextOccurrenceOnOrAfter('2026-01-31', 'month', 1, '2026-04-15')).toBe('2026-04-30');
  });

  it('rolls quarterly and yearly schedules', () => {
    expect(nextOccurrenceOnOrAfter('2025-01-15', 'month', 3, '2026-10-03')).toBe('2026-10-15');
    expect(nextOccurrenceOnOrAfter('2020-10-18', 'year', 1, '2026-10-19')).toBe('2027-10-18');
  });

  it('rolls weekly schedules', () => {
    expect(nextOccurrenceOnOrAfter('2026-09-01', 'week', 1, '2026-10-03')).toBe('2026-10-06');
    expect(nextOccurrenceOnOrAfter('2026-09-01', 'week', 2, '2026-09-29')).toBe('2026-09-29');
  });
});

describe('daysBetween', () => {
  it('counts calendar days, including across DST changes', () => {
    expect(daysBetween('2026-10-03', '2026-10-03')).toBe(0);
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-10-03', '2026-09-30')).toBe(-3);
  });
});

describe('ISO conversion', () => {
  it('validates real calendar dates only', () => {
    expect(isISODate('2028-02-29')).toBe(true);
    expect(isISODate('2026-02-29')).toBe(false);
    expect(isISODate('2026-13-01')).toBe(false);
    expect(isISODate('10/03/2026')).toBe(false);
  });

  it('uses the local calendar date', () => {
    expect(toISODate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
