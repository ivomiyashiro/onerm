import type { ViewStyle } from 'react-native';

/**
 * The Figma effect styles as `boxShadow` (supported by the new architecture, with inset and
 * spread). The background blurs (Blur/Scrim, Blur/Tabbar) are left out: they need a native view.
 */
export const elevation = {
  sheet: { boxShadow: '0px -30px 70px 0px rgba(0, 0, 0, 0.95)' },
  dialog: { boxShadow: '0px 30px 60px -20px rgba(0, 0, 0, 0.85)' },
  toast: { boxShadow: '0px 18px 40px -16px rgba(0, 0, 0, 0.7)' },
  thumb: { boxShadow: '0px 6px 16px -8px rgba(0, 0, 0, 0.8)' },
  surfaceHighlight: { boxShadow: 'inset 0px 1px 0px 0px rgba(255, 255, 255, 0.035)' },
  surfaceHighlightStrong: { boxShadow: 'inset 0px 1px 0px 0px rgba(255, 255, 255, 0.06)' },
  accentPlate: {
    boxShadow:
      'inset 0px 1px 0px 0px rgba(255, 255, 255, 0.5), inset 0px 0px 0px 5px rgba(16, 20, 0, 0.08)',
  },
  focusAccent: { boxShadow: '0px 0px 0px 4px rgba(197, 240, 74, 0.22)' },
  focusError: { boxShadow: '0px 0px 0px 4px rgba(255, 107, 107, 0.13)' },
} as const satisfies Record<string, Pick<ViewStyle, 'boxShadow'>>;
