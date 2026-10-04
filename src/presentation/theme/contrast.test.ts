import { colors, type ColorToken } from '@/presentation/theme/colors';
import { contrastRatio } from '@/presentation/theme/contrast';

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for a color on itself', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#C5F04A', '#C5F04A')).toBe(1);
  });

  it('composes a translucent background over the opaque one below it', () => {
    // Half black over white is #808080.
    expect(contrastRatio('#FFFFFF', 'rgba(0, 0, 0, 0.5)', '#FFFFFF')).toBe(
      contrastRatio('#FFFFFF', '#808080'),
    );
  });

  it('rejects a translucent background at the bottom', () => {
    expect(() => contrastRatio('#FFFFFF', 'rgba(0, 0, 0, 0.5)')).toThrow('opaque');
  });
});

// RNF-17: text ≥ 4.5:1 and control borders ≥ 3:1, on every surface where they are used.
// textTertiary is left out: it is only for disabled content (marca §11), which WCAG exempts.
const SURFACES: ColorToken[] = [
  'bgBase',
  'bgCard',
  'bgField',
  'bgRaised',
  'bgRaisedHover',
  'bgDialog',
  'bgSheet',
  'bgSheetItem',
  'bgCurrent',
];
const PANELS: ColorToken[] = ['bgBase', 'bgCard', 'bgSheet', 'bgDialog'];

type Pair = [foreground: ColorToken, ...backgrounds: ColorToken[]];

const pairs = (foregrounds: ColorToken[], backgrounds: ColorToken[]): Pair[] =>
  foregrounds.flatMap((f) => backgrounds.map((b): Pair => [f, b]));

const TEXT_PAIRS: Pair[] = [
  ...pairs(['textPrimary', 'textSecondary'], SURFACES),
  ...pairs(['textAccent', 'textOk', 'textWarn', 'textErr'], PANELS),
  ['textPlaceholder', 'bgField'],
  ['textPlaceholder', 'bgCard'],
  ...pairs(['textOnAccent'], ['bgAccent', 'bgAccentTop', 'bgAccentBottom', 'bgAccentHover']),
  ['textOnInverse', 'bgInverse'],
  ...PANELS.flatMap((panel): Pair[] => [
    ['textAccent', 'bgAccentSoft', panel],
    ['textOk', 'bgOkSoft', panel],
    ['textWarn', 'bgWarnSoft', panel],
    ['textErr', 'bgErrSoft', panel],
    ['textErr', 'bgErrSoftStrong', panel],
  ]),
];

const BORDER_PAIRS: Pair[] = pairs(['borderControl'], [...PANELS, 'bgField']);

describe('token contrast (RNF-17)', () => {
  it.each(TEXT_PAIRS)('%s on %s ≥ 4.5:1', (foreground, ...backgrounds) => {
    const ratio = contrastRatio(colors[foreground], ...backgrounds.map((b) => colors[b]));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it.each(BORDER_PAIRS)('%s on %s ≥ 3:1', (foreground, background) => {
    expect(contrastRatio(colors[foreground], colors[background])).toBeGreaterThanOrEqual(3);
  });
});
