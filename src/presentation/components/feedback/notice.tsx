import { StyleSheet, View } from 'react-native';

import { Icon } from '@/presentation/components/icons/icon';
import { Text } from '@/presentation/components/text';
import { colors, radius, typography } from '@/presentation/theme';

/** Figma «Notice» (Info): a neutral inline notice inside a screen, with the info icon. */
export function Notice({ message }: { message: string }) {
  return (
    <View style={styles.notice}>
      <Icon name="info" size={18} color={colors.textSecondary} />
      <Text style={[typography.bodyM, styles.message]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  message: { flex: 1, color: colors.textPrimary },
});
