import { StyleSheet, View } from 'react-native';

import Fold from '@/presentation/components/brand/svg/logo-fold.svg';
import Plate from '@/presentation/components/brand/svg/logo-plate.svg';
import { Text } from '@/presentation/components/text';
import { strings } from '@/presentation/strings';
import { colors, fonts } from '@/presentation/theme';

/**
 * Figma «Logo/Marca» (64 × 64): the cut plate with the folded corner and «1RM». Decorative: the
 * screen title next to it says what matters, so it is hidden from screen readers.
 */
export function Logo() {
  return (
    <View
      style={styles.logo}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Plate width={60} height={60} style={styles.plate} />
      <Fold width={24} height={12} style={styles.fold} />
      <Text style={styles.mark}>{strings.common.brandMark}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { width: 64, height: 64 },
  plate: { position: 'absolute', left: 2, top: 2 },
  fold: { position: 'absolute', left: 38, top: 50 },
  mark: {
    position: 'absolute',
    left: 5.5,
    top: 20,
    fontFamily: fonts.number,
    fontSize: 30,
    lineHeight: 30,
    letterSpacing: -1,
    color: colors.textOnAccent,
  },
});
