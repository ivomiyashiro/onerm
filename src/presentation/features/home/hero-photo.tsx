import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { DayKind } from '@/domain/rules/routine/day-kind';
import { colors } from '@/presentation/theme';

/** marca §9: one photo per kind of day (Unsplash, credited in S22). */
const PHOTOS: Record<DayKind, ImageSourcePropType> = {
  lower: require('@/presentation/assets/photos/deadlift.jpg'),
  upper: require('@/presentation/assets/photos/grip.jpg'),
  fullBody: require('@/presentation/assets/photos/rack.jpg'),
};

/** Figma HeroCard «Velo»: 15 % of the background at the top, ≥ 65 % from 30 % down (marca §9). */
const VEIL = [
  { offset: 0, opacity: 0.15 },
  { offset: 0.3, opacity: 0.65 },
  { offset: 0.6, opacity: 0.85 },
  { offset: 1, opacity: 0.97 },
];

/**
 * The background of the «Hoy toca» card: the photo already in black and white, dimmed to 70 %
 * brightness, and the veil that keeps the text over it at ≥ 4.5:1 (marca §9, RNF-17).
 * Decorative: hidden from screen readers.
 */
export function HeroPhoto({ kind }: { kind: DayKind }) {
  return (
    <View
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image source={PHOTOS[kind]} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgPhotoDim }]} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
            {VEIL.map(({ offset, opacity }) => (
              <Stop key={offset} offset={offset} stopColor={colors.bgBase} stopOpacity={opacity} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#veil)" />
      </Svg>
    </View>
  );
}
