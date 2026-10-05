import { makeAsset, makeItem } from '@/domain/__fixtures__/items';
import { matchesAssetSearch, matchesSearch } from '@/domain/search';

describe('matchesSearch', () => {
  const item = makeItem({
    name: 'Car insurance',
    category: 'insurance',
    provider: 'Geico',
    notes: 'Policy for the Honda',
  });

  it('matches everything when the query is empty', () => {
    expect(matchesSearch(item, '')).toBe(true);
    expect(matchesSearch(item, '   ')).toBe(true);
  });

  it('searches the name, company, category and notes, ignoring case', () => {
    expect(matchesSearch(item, 'CAR')).toBe(true);
    expect(matchesSearch(item, 'geico')).toBe(true);
    expect(matchesSearch(makeItem({ name: 'Netflix' }), 'subscription')).toBe(true);
    expect(matchesSearch(item, 'honda')).toBe(true);
  });

  it('needs every word to match', () => {
    expect(matchesSearch(item, 'car ins')).toBe(true);
    expect(matchesSearch(item, 'car netflix')).toBe(false);
  });
});

describe('searching vehicles and homes', () => {
  it('finds items by the vehicle or home they belong to', () => {
    const oil = makeItem({ name: 'Oil change', category: 'vehicle' });
    expect(matchesSearch(oil, 'civic oil', 'Honda Civic')).toBe(true);
    expect(matchesSearch(oil, 'civic')).toBe(false);
  });

  it('finds vehicles and homes by name, plate number or notes', () => {
    const car = makeAsset({ details: { plate: 'ABC-1234' }, notes: 'Blue' });
    expect(['honda', 'abc', 'blue', ''].map((q) => matchesAssetSearch(car, q))).toEqual([true, true, true, true]);
    expect(matchesAssetSearch(car, 'toyota')).toBe(false);
  });
});
