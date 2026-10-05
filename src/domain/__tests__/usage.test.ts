import { makeAsset, makeTask } from '@/domain/__fixtures__/items';
import { vehiclesNeedingReading } from '@/domain/assets';
import {
  buildUsageMap,
  defaultDistanceUnit,
  distanceDue,
  formatDistance,
  parseDistanceInput,
  summarizeUsage,
} from '@/domain/usage';

const reading = (id: number, value: number, date: string, assetId = 1) => ({ id, assetId, reading: value, date });

describe('summarizeUsage', () => {
  const car = makeAsset();

  it('uses the latest reading and averages the distance per day', () => {
    const usage = summarizeUsage(car, [
      reading(1, 40000, '2026-07-03'),
      reading(2, 43000, '2026-10-01'),
      reading(3, 41000, '2026-08-01'),
    ]);
    expect(usage).toEqual({ unit: 'km', reading: 43000, readingDate: '2026-10-01', perDay: 3000 / 90 });
  });

  it('only estimates from readings at least two weeks apart, within the last year', () => {
    expect(summarizeUsage(car, [reading(1, 40000, '2026-09-25'), reading(2, 40500, '2026-10-01')])?.perDay).toBeNull();
    expect(
      summarizeUsage(car, [reading(1, 10000, '2024-01-01'), reading(2, 40000, '2026-09-01'), reading(3, 41000, '2026-10-01')])
        ?.perDay,
    ).toBeCloseTo(1000 / 30);
  });

  it('gives no estimate when the odometer went down, and nothing without readings', () => {
    expect(summarizeUsage(car, [reading(1, 40000, '2026-08-01'), reading(2, 100, '2026-10-01')])).toMatchObject({
      reading: 100,
      perDay: null,
    });
    expect(summarizeUsage(car, [reading(1, 100, '2026-10-01', 2)])).toBeNull();
    expect(summarizeUsage(makeAsset({ kind: 'home', usageUnit: null }), [reading(1, 1, '2026-10-01')])).toBeNull();
  });

  it('maps vehicles by ID', () => {
    const map = buildUsageMap([car, makeAsset({ id: 2 })], [reading(1, 500, '2026-10-01', 2)]);
    expect([...map.keys()]).toEqual([2]);
  });
});

describe('distanceDue', () => {
  const usage = { unit: 'km' as const, reading: 45000, readingDate: '2026-10-01', perDay: 50 };

  it('estimates when the target will be reached', () => {
    expect(distanceDue(makeTask({ nextUsage: 50000 }), usage)).toEqual({
      unit: 'km',
      target: 50000,
      left: 5000,
      date: '2027-01-09', // 100 days at 50 km a day
    });
  });

  it('dates a reached target to the reading that showed it', () => {
    expect(distanceDue(makeTask({ nextUsage: 44000 }), usage)).toMatchObject({ left: -1000, date: '2026-10-01' });
  });

  it('gives no date without an average, and nothing for other units or items', () => {
    expect(distanceDue(makeTask(), { ...usage, perDay: null })?.date).toBeNull();
    expect(distanceDue(makeTask({ usageUnit: 'mi' }), usage)).toBeNull();
    expect(distanceDue(makeTask({ nextUsage: null }), usage)).toBeNull();
    expect(distanceDue(makeTask({ scheduleType: 'recurring' }), usage)).toBeNull();
    expect(distanceDue(makeTask(), undefined)).toBeNull();
  });
});

describe('distance input and display', () => {
  it('reads whole numbers with or without separators', () => {
    expect(['45300', '45,300', '45.300', '45 300', '1,000,000'].map(parseDistanceInput)).toEqual([
      45300, 45300, 45300, 45300, 1000000,
    ]);
    expect(['', 'abc', '45300.5', '4,53', '-5', '99999999'].map(parseDistanceInput)).toEqual([
      null, null, null, null, null, null,
    ]);
  });

  it('formats with the unit', () => {
    expect(formatDistance(45300, 'km')).toMatch(/^45.300 km$/);
  });

  it('defaults to miles in the US and UK', () => {
    expect(['USD', 'GBP', 'INR', 'EUR'].map(defaultDistanceUnit)).toEqual(['mi', 'mi', 'km', 'km']);
  });
});

describe('vehiclesNeedingReading', () => {
  const car = makeAsset();
  const today = '2026-10-05';

  it('lists vehicles tracking distances without a recent reading', () => {
    const items = [makeTask()];
    expect(vehiclesNeedingReading([car], items, new Map(), today)).toEqual([{ asset: car, lastDate: null }]);
    const old = new Map([[1, { unit: 'km' as const, reading: 1, readingDate: '2026-08-01', perDay: null }]]);
    expect(vehiclesNeedingReading([car], items, old, today)).toEqual([{ asset: car, lastDate: '2026-08-01' }]);
    const fresh = new Map([[1, { unit: 'km' as const, reading: 1, readingDate: '2026-09-20', perDay: null }]]);
    expect(vehiclesNeedingReading([car], items, fresh, today)).toEqual([]);
  });

  it('ignores vehicles with no active distance-based tasks', () => {
    expect(vehiclesNeedingReading([car], [makeTask({ nextUsage: null })], new Map(), today)).toEqual([]);
    expect(vehiclesNeedingReading([car], [makeTask({ status: 'paused' })], new Map(), today)).toEqual([]);
  });
});
