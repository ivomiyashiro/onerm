import { StyleSheet, View } from 'react-native';

import Fold from '@/presentation/components/brand/svg/logo-fold.svg';
import Plate from '@/presentation/components/brand/svg/logo-plate.svg';
import { Text } from '@/presentation/components/text';
import { strings } from '@/presentation/strings';
import { colors, fonts } from '@/presentation/theme';

/** The Figma frame of the mark: every measure below is at this size and scales with `size`. */
const BASE = 64;

/**
 * Figma «Logo/Marca» (64 × 64): the cut plate with the folded corner and «1RM», scaled in
 * proportion (36 in the top bar of Inicio). Like the primary button, the two uncut corners round
 * with the same 12 as the cut. Decorative: the screen title next to it says what
 * matters, so it is hidden from screen readers.
 */
export function Logo({ size = BASE }: { size?: number }) {
  const k = size / BASE;
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Plate
        width={60 * k}
        height={60 * k}
        style={[styles.absolute, { left: 2 * k, top: 2 * k }]}
      />
      <Fold
        width={24 * k}
        height={12 * k}
        style={[styles.absolute, { left: 38 * k, top: 50 * k }]}
      />
      <Text
        style={[
          styles.mark,
          {
            left: 5.5 * k,
            top: 20 * k,
            fontSize: 30 * k,
            lineHeight: 30 * k,
            letterSpacing: -1 * k,
          },
        ]}
      >
        {strings.common.brandMark}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  absolute: { position: 'absolute' },
  mark: { position: 'absolute', fontFamily: fonts.number, color: colors.textOnAccent },
});
