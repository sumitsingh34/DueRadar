import { makeItem } from '@/domain/__fixtures__/items';
import { findPriceIncreases } from '@/domain/insights';

const price = (itemId: number, amountCents: number, effectiveDate: string, currency = 'USD') => ({
  itemId,
  amountCents,
  currency,
  effectiveDate,
});

describe('findPriceIncreases', () => {
  it('compares the current price with the first recorded one, biggest rise first', () => {
    const internet = makeItem({ id: 1, name: 'Internet', amountCents: 8000 });
    const netflix = makeItem({ id: 2, name: 'Netflix', amountCents: 1799 });
    const history = [
      price(1, 6500, '2025-06-01'),
      price(1, 5500, '2024-01-01'),
      price(1, 8000, '2026-01-01'),
      price(2, 1549, '2025-01-01'),
      price(2, 1799, '2026-02-01'),
    ];
    expect(findPriceIncreases([netflix, internet], history)).toEqual([
      { item: internet, fromCents: 5500, toCents: 8000, since: '2024-01-01', percent: 45 },
      { item: netflix, fromCents: 1549, toCents: 1799, since: '2025-01-01', percent: 16 },
    ]);
  });

  it('ignores price drops, single prices, other currencies and inactive items', () => {
    const items = [
      makeItem({ id: 1, amountCents: 900 }),
      makeItem({ id: 2, amountCents: 1000 }),
      makeItem({ id: 3, amountCents: 2000, currency: 'EUR' }),
      makeItem({ id: 4, amountCents: 2000, status: 'cancelled' }),
    ];
    const history = [
      price(1, 1000, '2025-01-01'),
      price(2, 1000, '2025-01-01'),
      price(3, 1000, '2025-01-01', 'USD'),
      price(4, 1000, '2025-01-01'),
    ];
    expect(findPriceIncreases(items, history)).toEqual([]);
  });
});
