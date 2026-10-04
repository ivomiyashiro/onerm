import { colors, palette } from '@/presentation/theme/colors';

// Values copied from the Figma variables (collections «Primitivos» and «Color · Oscuro»).
describe('palette', () => {
  it.each([
    ['neutral950', '#0E0E0D'],
    ['neutral900', '#161615'],
    ['neutral50', '#F4F4EF'],
    ['lime500', '#C5F04A'],
    ['limeInk', '#101400'],
    ['teal400', '#3DD6C4'],
    ['orange400', '#FFA94D'],
    ['red400', '#FF6B6B'],
    ['whiteA7', 'rgba(255, 255, 255, 0.07)'],
    ['blackA74', 'rgba(0, 0, 0, 0.74)'],
  ] as const)('%s is %s', (name, value) => {
    expect(palette[name]).toBe(value);
  });
});

describe('colors', () => {
  it.each([
    ['bgBase', 'neutral950'],
    ['bgCard', 'neutral900'],
    ['bgField', 'neutral800'],
    ['bgRaised', 'neutral700'],
    ['bgDialog', 'neutral850'],
    ['bgSheet', 'neutral750'],
    ['bgAccent', 'lime500'],
    ['bgAccentSoft', 'limeA12'],
    ['bgScrim', 'blackA74'],
    ['textPrimary', 'neutral50'],
    ['textSecondary', 'neutral300'],
    ['textTertiary', 'neutral500'],
    ['textPlaceholder', 'neutral400'],
    ['textAccent', 'lime500'],
    ['textOnAccent', 'limeInk'],
    ['textOk', 'teal400'],
    ['textWarn', 'orange400'],
    ['textErr', 'red400'],
    ['borderHair', 'whiteA7'],
    ['borderControl', 'neutral450'],
    ['borderAccentSoft', 'limeA55'],
    ['borderErr', 'red400'],
  ] as const)('%s points to %s', (token, primitive) => {
    expect(colors[token]).toBe(palette[primitive]);
  });
});
