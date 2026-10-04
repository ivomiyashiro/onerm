/** Spacing, radii and sizes, from the Figma collection «Medidas». */
export const space = {
  s2: 2,
  s4: 4,
  s6: 6,
  s8: 8,
  s10: 10,
  s12: 12,
  s14: 14,
  s16: 16,
  s20: 20,
  s24: 24,
  s32: 32,
  s40: 40,
  s56: 56,
} as const;

export const radius = {
  xs: 2,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 999,
} as const;

export const size = {
  /** RNF-16: every touch target. */
  targetMin: 48,
  /** RNF-16: the workout actions ("Hecho", ±). */
  targetMain: 56,
  targetXl: 64,
} as const;
