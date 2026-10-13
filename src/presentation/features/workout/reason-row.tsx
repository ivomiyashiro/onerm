import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/presentation/components/icons/icon';
import { Text } from '@/presentation/components/text';
import { common } from '@/presentation/strings/common';
import { colors, space, typography } from '@/presentation/theme';

interface ReasonRowProps {
  line: string;
  icon: IconName;
  /** «¿Por qué?» opens S10. */
  onWhy: () => void;
}

/** Figma «ReasonRow»: the reason of the suggestion in one line and «¿Por qué?» (RF-SUG-07.AC1). */
export function ReasonRow({ line, icon, onWhy }: ReasonRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.circle}>
        <Icon name={icon} size={16} color={colors.textPrimary} />
      </View>
      <Text style={[typography.bodyM, styles.line]}>{line}</Text>
      <Pressable accessibilityRole="button" onPress={onWhy} style={styles.why} hitSlop={4}>
        <Text style={[typography.bodyMStrong, styles.link]}>{common.why}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s10,
    minHeight: 58,
    paddingVertical: 6,
    paddingRight: 6,
    paddingLeft: space.s12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgRaised,
  },
  line: { flex: 1, color: colors.textPrimary },
  why: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.s10 },
  link: { color: colors.textPrimary, textDecorationLine: 'underline' },
});
