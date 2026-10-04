import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Icon } from '@/presentation/components/icons/icon';
import { colors, elevation, size } from '@/presentation/theme';

interface PlateProps {
  sign: 'minus' | 'plus';
  accessibilityLabel: string;
  onPress: () => void;
}

/** Figma «Plate»: the lime ± disc of the workout (56 dp, RNF-16). */
export function Plate({ sign, accessibilityLabel, onPress }: PlateProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.plate, pressed && styles.pressed]}
    >
      <View style={styles.fill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="plate" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.bgAccentTop} />
              <Stop offset="0.55" stopColor={colors.bgAccent} />
              <Stop offset="1" stopColor={colors.bgAccentBottom} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#plate)" />
        </Svg>
      </View>
      <Icon name={sign} color={colors.textOnAccent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  plate: {
    width: size.targetMain,
    height: size.targetMain,
    borderRadius: size.targetMain / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.accentPlate,
  },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  pressed: { transform: [{ scale: 0.96 }] },
});
