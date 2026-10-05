import { PixelRatio, Platform, Text as NativeText, StyleSheet, type TextProps } from 'react-native';

/**
 * Half a physical pixel, in dp.
 *
 * On Android 15+, React Native 0.86 measures a text by the sum of its glyph advances but draws it
 * by its visual bounds, which can be a fraction of a pixel wider. A text that hugs its content
 * (a button label, a chip) then gets a box slightly too narrow and its last word wraps to a hidden
 * second line ("Abrir la hoja" → "Abrir la"). Yoga rounds a text node's left edge down and its
 * right edge up, so with this end padding the text keeps at least one more pixel than it measured.
 * Upstream fix: facebook/react-native#57117; remove this when the React Native in use includes it.
 */
export const TEXT_SLACK = 0.5 / PixelRatio.get();

function needsSlack(): boolean {
  return Platform.OS === 'android' && Number(Platform.Version) >= 35;
}

/** The app's Text: React Native's, plus the Android 15+ slack above. Use it instead of RN's. */
export function Text({ style, ...props }: TextProps) {
  if (!needsSlack()) return <NativeText style={style} {...props} />;

  const flat = StyleSheet.flatten(style) ?? {};
  const right = flat.paddingRight ?? flat.paddingEnd ?? flat.paddingHorizontal ?? flat.padding ?? 0;
  if (typeof right !== 'number') return <NativeText style={style} {...props} />;

  return <NativeText style={[style, { paddingRight: right + TEXT_SLACK }]} {...props} />;
}
