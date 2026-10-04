import type { TextStyle } from 'react-native';

/**
 * Font files in assets/fonts (tools/fonts/build-fonts.py). Each one is a single weight and width,
 * so styles set fontFamily and never fontWeight (Android would fake the bold).
 */
export const fonts = {
  regular: 'Archivo-Regular',
  medium: 'Archivo-Medium',
  semiBold: 'Archivo-SemiBold',
  bold: 'Archivo-Bold',
  extraBold: 'Archivo-ExtraBold',
  /** wdth 75: load, reps and every number. */
  number: 'ArchivoCondensed-Bold',
  /** wdth 125: brand display ("HOY TOCA"). */
  display: 'ArchivoExpanded-ExtraBold',
  /** Times (rest timer). */
  mono: 'JetBrainsMono-Bold',
} as const;

type TypeStyle = Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing' | 'textTransform' | 'fontVariant'
>;

interface StyleSpec {
  font: string;
  size: number;
  /** Line height as a percentage of the size, as in Figma. */
  lineHeight: number;
  /** Letter spacing as a percentage of the size, as in Figma. */
  tracking?: number;
  uppercase?: boolean;
  tabular?: boolean;
}

function style({ font, size, lineHeight, tracking = 0, uppercase, tabular }: StyleSpec): TypeStyle {
  return {
    fontFamily: font,
    fontSize: size,
    lineHeight: (size * lineHeight) / 100,
    letterSpacing: (size * tracking) / 100,
    ...(uppercase && { textTransform: 'uppercase' }),
    ...(tabular && { fontVariant: ['tabular-nums'] }),
  };
}

const display = (size: number, lineHeight: number, tracking: number) =>
  style({ font: fonts.display, size, lineHeight, tracking, uppercase: true });
const number = (size: number, lineHeight = 100, tracking = -1) =>
  style({ font: fonts.number, size, lineHeight, tracking, tabular: true });
const mono = (size: number, lineHeight: number, tracking = 0) =>
  style({ font: fonts.mono, size, lineHeight, tracking, tabular: true });

/** The Figma text styles, one entry per style («Display/XL» → displayXl). */
export const typography = {
  displayXl: display(72, 86, -2.5),
  displayMl: display(40, 92, -2.5),
  displayL: display(46, 86, -2.5),
  displayM: display(34, 95, -2),
  displaySm: display(30, 92, -2),
  displayS: display(20, 100, -1),

  numberHero: number(56),
  numberL: number(34),
  numberMl: number(28),
  numberM: number(26),
  numberMs: number(22),
  numberSm: number(20),
  numberS: number(18, 110, 0),
  numberKeypad: style({ font: fonts.regular, size: 24, lineHeight: 120, tabular: true }),

  titleXl: style({ font: fonts.bold, size: 26, lineHeight: 115, tracking: -1 }),
  titleL: style({ font: fonts.bold, size: 20, lineHeight: 120, tracking: -1 }),
  titleM: style({ font: fonts.bold, size: 17, lineHeight: 125, tracking: -0.5 }),

  bodyL: style({ font: fonts.regular, size: 16, lineHeight: 145 }),
  bodyLStrong: style({ font: fonts.semiBold, size: 16, lineHeight: 140 }),
  bodyRow: style({ font: fonts.semiBold, size: 15, lineHeight: 130 }),
  bodyRowBold: style({ font: fonts.bold, size: 15, lineHeight: 130 }),
  bodyM: style({ font: fonts.regular, size: 14, lineHeight: 140 }),
  bodyMStrong: style({ font: fonts.semiBold, size: 14, lineHeight: 140 }),
  bodyMBold: style({ font: fonts.bold, size: 14, lineHeight: 130 }),
  bodyS: style({ font: fonts.medium, size: 13, lineHeight: 140 }),

  label: style({ font: fonts.bold, size: 12, lineHeight: 120, tracking: 10, uppercase: true }),
  labelS: style({ font: fonts.bold, size: 10, lineHeight: 120, tracking: 10, uppercase: true }),
  tab: style({ font: fonts.bold, size: 12, lineHeight: 120 }),

  buttonPrimary: style({
    font: fonts.extraBold,
    size: 16,
    lineHeight: 120,
    tracking: 4,
    uppercase: true,
  }),
  buttonPrimaryXl: style({
    font: fonts.extraBold,
    size: 18,
    lineHeight: 120,
    tracking: 4,
    uppercase: true,
  }),
  buttonDefault: style({ font: fonts.bold, size: 16, lineHeight: 120 }),

  monoHero: mono(60, 100, -2),
  monoL: mono(26, 100),
  monoM: mono(16, 110),
  monoS: mono(13, 120),
  monoXs: mono(11, 120),
} as const satisfies Record<string, TypeStyle>;

export type TypographyToken = keyof typeof typography;
