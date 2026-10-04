import { makeItem } from '@/domain/__fixtures__/items';
import { matchesSearch } from '@/domain/search';

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
