import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/presentation/theme';

/** marca §9: the photos of the app (Unsplash, credited in S22), already in black and white. */
const PHOTOS = {
  deadlift: require('@/presentation/assets/photos/deadlift.jpg'),
  grip: require('@/presentation/assets/photos/grip.jpg'),
  rack: require('@/presentation/assets/photos/rack.jpg'),
} satisfies Record<string, ImageSourcePropType>;

export type PhotoName = keyof typeof PHOTOS;

/** A vertical gradient of the background color: its opacity at each offset, top to bottom. */
export type Veil = readonly { offset: number; opacity: number }[];

/**
 * A photo filling its container, dimmed to 70 % brightness and under a veil that keeps the text
 * over it at ≥ 4.5:1 (marca §9, RNF-17). Decorative: hidden from screen readers.
 */
export function VeiledPhoto({ photo, veil }: { photo: PhotoName; veil: Veil }) {
  return (
    <View
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image source={PHOTOS[photo]} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgPhotoDim }]} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
            {veil.map(({ offset, opacity }) => (
              <Stop key={offset} offset={offset} stopColor={colors.bgBase} stopOpacity={opacity} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#veil)" />
      </Svg>
    </View>
  );
}
