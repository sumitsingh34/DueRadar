import { monthlyEquivalentCents, parseAmountInput } from '@/domain/money';

describe('parseAmountInput', () => {
  it('accepts whole amounts and up to two decimals', () => {
    expect(parseAmountInput('15')).toBe(1500);
    expect(parseAmountInput('15.49')).toBe(1549);
    expect(parseAmountInput('15,5')).toBe(1550);
    expect(parseAmountInput(' 0.99 ')).toBe(99);
  });

  it('rejects anything else', () => {
    expect(parseAmountInput('')).toBeNull();
    expect(parseAmountInput('abc')).toBeNull();
    expect(parseAmountInput('1.999')).toBeNull();
    expect(parseAmountInput('-5')).toBeNull();
    expect(parseAmountInput('1,000.00')).toBeNull();
  });
});

describe('monthlyEquivalentCents', () => {
  it('normalizes each frequency to a monthly amount', () => {
    expect(monthlyEquivalentCents(1549, 'month', 1)).toBe(1549);
    expect(monthlyEquivalentCents(6500, 'year', 1)).toBeCloseTo(541.67, 2);
    expect(monthlyEquivalentCents(3000, 'month', 3)).toBe(1000);
    expect(monthlyEquivalentCents(1000, 'week', 1)).toBeCloseTo(4333.33, 2);
  });
});
