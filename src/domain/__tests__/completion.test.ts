import { makeItem, makeTask } from '@/domain/__fixtures__/items';
import { nextAfterDone, nextAfterRenewal } from '@/domain/completion';

describe('nextAfterDone', () => {
  it('counts the next date and distance from when it was done', () => {
    expect(nextAfterDone(makeTask({ dueDate: '2026-10-01' }), '2026-10-20', 51000)).toEqual({
      dueDate: '2027-04-20',
      nextUsage: 61000,
    });
  });

  it('keeps the distance target when no reading is given', () => {
    expect(nextAfterDone(makeTask({ nextUsage: 50000 }), '2026-10-20', null).nextUsage).toBe(50000);
    expect(nextAfterDone(makeTask({ usageInterval: null, nextUsage: null }), '2026-10-20', 51000).nextUsage).toBeNull();
  });
});

describe('nextAfterRenewal', () => {
  it('keeps to the schedule, even when renewed early or late', () => {
    expect(nextAfterRenewal(makeItem({ dueDate: '2026-12-01', intervalUnit: 'year' }))).toBe('2027-12-01');
    expect(nextAfterRenewal(makeItem({ dueDate: '2026-01-31' }))).toBe('2026-02-28');
    expect(nextAfterRenewal(makeItem({ intervalUnit: null }))).toBeNull();
  });
});
