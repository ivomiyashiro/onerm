import { StyleSheet, View } from 'react-native';

import { Icon } from '@/presentation/components/icons/icon';
import { Text } from '@/presentation/components/text';
import { colors, radius, typography } from '@/presentation/theme';

interface NoticeProps {
  message: string;
  /** Info: neutral, with the info icon. Warn: orange tint, with the alert icon (RIR 0 in S15). */
  tone?: 'info' | 'warn';
}

/** Figma «Notice»: an inline notice inside a screen. */
export function Notice({ message, tone = 'info' }: NoticeProps) {
  const warn = tone === 'warn';
  return (
    <View style={[styles.notice, warn && styles.warn]}>
      <Icon
        name={warn ? 'alert' : 'info'}
        size={18}
        color={warn ? colors.textWarn : colors.textSecondary}
      />
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
  warn: { borderColor: colors.borderWarnSoft, backgroundColor: colors.bgWarnSoft },
  message: { flex: 1, color: colors.textPrimary },
});
