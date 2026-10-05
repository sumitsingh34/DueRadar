import { AVAILABLE_CATEGORIES, getCategory } from '@/domain/categories';
import { findTemplates, POPULAR_TEMPLATES, templateSchedule, TEMPLATES } from '@/domain/templates';

describe('findTemplates', () => {
  const names = (query: string) => findTemplates(query).map((t) => t.name);

  it('puts names that start with the query first', () => {
    expect(names('net')[0]).toBe('Netflix');
    expect(names('in').slice(0, 2)).toEqual(['Income tax return', 'Internet']);
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

  it('give warranties a length, and only warranties', () => {
    for (const template of TEMPLATES) {
      expect(template.warrantyYears != null).toBe(template.category === 'warranty');
      if (template.category === 'warranty') expect(template.frequency).toBeUndefined();
    }
    expect(findTemplates('lap')).toEqual([{ name: 'Laptop', category: 'warranty', warrantyYears: 1 }]);
  });

  it('use a schedule their category offers', () => {
    for (const template of TEMPLATES) {
      expect(getCategory(template.category).schedules).toContain(templateSchedule(template));
    }
    expect(templateSchedule(TEMPLATES.find((t) => t.name === 'Oil change')!)).toBe('task');
    expect(templateSchedule(TEMPLATES.find((t) => t.name === 'Vehicle registration')!)).toBe('recurring');
  });

  it('only give distances to vehicle tasks, in both units', () => {
    for (const template of TEMPLATES.filter((t) => t.distance)) {
      expect(template.task).toBe(true);
      expect(getCategory(template.category).assets?.kinds).toContain('vehicle');
      expect(template.distance!.km).toBeGreaterThan(template.distance!.mi);
    }
  });
});

describe('document templates', () => {
  it('only skip the date for documents that never expire', () => {
    for (const template of TEMPLATES.filter((t) => t.noDate)) {
      expect(getCategory(template.category).dateOptional).toBe(true);
    }
    expect(TEMPLATES.find((t) => t.name === 'Passport')).toEqual({ name: 'Passport', category: 'document' });
  });
});
