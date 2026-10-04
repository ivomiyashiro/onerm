import { fonts, typography } from '@/presentation/theme/typography';

// Literal values of the Figma text styles: size, line height (% of the size), letter spacing
// (% of the size) and the Archivo width (wdth axis) of each family.
describe('typography', () => {
  it.each([
    ['displayXl', fonts.display, 72, 61.92, -1.8, 'uppercase'],
    ['displayL', fonts.display, 46, 39.56, -1.15, 'uppercase'],
    ['numberHero', fonts.number, 56, 56, -0.56, undefined],
    ['numberM', fonts.number, 26, 26, -0.26, undefined],
    ['titleL', fonts.bold, 20, 24, -0.2, undefined],
    ['bodyL', fonts.regular, 16, 23.2, 0, undefined],
    ['bodyMStrong', fonts.semiBold, 14, 19.6, 0, undefined],
    ['bodyS', fonts.medium, 13, 18.2, 0, undefined],
    ['label', fonts.bold, 12, 14.4, 1.2, 'uppercase'],
    ['buttonPrimary', fonts.extraBold, 16, 19.2, 0.64, 'uppercase'],
    ['buttonDefault', fonts.bold, 16, 19.2, 0, undefined],
    ['monoHero', fonts.mono, 60, 60, -1.2, undefined],
  ] as const)('%s', (name, fontFamily, fontSize, lineHeight, letterSpacing, textTransform) => {
    const style = typography[name];

    expect(style.fontFamily).toBe(fontFamily);
    expect(style.fontSize).toBe(fontSize);
    expect(style.lineHeight).toBeCloseTo(lineHeight, 2);
    expect(style.letterSpacing).toBeCloseTo(letterSpacing, 2);
    expect(style.textTransform).toBe(textTransform);
  });

  it('numbers and times use tabular digits', () => {
    for (const name of ['numberHero', 'numberS', 'numberKeypad', 'monoL', 'monoXs'] as const) {
      expect(typography[name].fontVariant).toEqual(['tabular-nums']);
    }
  });

  it('never sets fontWeight: each weight is its own font file', () => {
    for (const style of Object.values(typography)) {
      expect(style).not.toHaveProperty('fontWeight');
    }
  });

  it('numbers use the condensed width and display the expanded one', () => {
    expect(fonts.number).toBe('ArchivoCondensed-Bold');
    expect(fonts.display).toBe('ArchivoExpanded-ExtraBold');
  });
});
