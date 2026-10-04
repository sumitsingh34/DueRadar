import { AVAILABLE_CATEGORIES } from '@/domain/categories';
import { findTemplates, POPULAR_TEMPLATES, TEMPLATES } from '@/domain/templates';

describe('findTemplates', () => {
  const names = (query: string) => findTemplates(query).map((t) => t.name);

  it('puts names that start with the query first', () => {
    expect(names('net')[0]).toBe('Netflix');
    expect(names('in')[0]).toBe('Internet');
    expect(names('disney')).toEqual(['Disney+']);
  });

  it('matches the start of any word', () => {
    expect(names('prime')).toContain('Amazon Prime');
    expect(names('insurance')).toContain('Car insurance');
  });

  it('ignores case and punctuation, and needs two characters', () => {
    expect(names('SAMS')).toEqual(["Sam's Club"]);
    expect(names('n')).toEqual([]);
  });
});

describe('templates', () => {
  it('only use categories the app offers', () => {
    const available = new Set(AVAILABLE_CATEGORIES.map((c) => c.id));
    expect(TEMPLATES.filter((t) => !available.has(t.category))).toEqual([]);
  });

  it('have unique names, and popular ones exist', () => {
    expect(new Set(TEMPLATES.map((t) => t.name)).size).toBe(TEMPLATES.length);
    expect(POPULAR_TEMPLATES.every(Boolean)).toBe(true);
  });

  it('are either something that renews or a product with a warranty', () => {
    for (const template of TEMPLATES) {
      if (template.category === 'warranty') {
        expect(template.warrantyYears).toBeGreaterThan(0);
        expect(template.frequency).toBeUndefined();
      } else {
        expect(template.frequency).toBeDefined();
      }
    }
    expect(findTemplates('lap')).toEqual([{ name: 'Laptop', category: 'warranty', warrantyYears: 1 }]);
  });
});
