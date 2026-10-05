import { CATEGORIES } from '@/domain/categories';
import { contrastRatio, textColorOn } from '@/utils/color';

describe('textColorOn', () => {
  it('picks white on dark colors and black on light ones', () => {
    expect(textColorOn('#000000')).toBe('#ffffff');
    expect(textColorOn('#6E56CF')).toBe('#ffffff');
    expect(textColorOn('#ffffff')).toBe('#000000');
    expect(textColorOn('#E2A336')).toBe('#000000');
  });

  it('keeps the numbers on every category color readable', () => {
    for (const { color } of CATEGORIES) {
      expect(contrastRatio(color, textColorOn(color))).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('contrastRatio', () => {
  it('goes from 1 for the same color to 21 for black on white', () => {
    expect(contrastRatio('#208AEF', '#208AEF')).toBe(1);
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21);
  });
});
