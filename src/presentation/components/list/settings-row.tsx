import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/presentation/components/icons/icon';
import { Text } from '@/presentation/components/text';
import { colors, typography } from '@/presentation/theme';

interface SettingsRowProps {
  label: string;
  /** The current value, before the chevron. */
  value?: string;
  onPress: () => void;
  /** Draws the divider above: every row of a group but the first. */
  divided?: boolean;
}

/** Figma «SettingsRow» (Navigate): 56 dp, the label, the current value and a chevron. */
export function SettingsRow({ label, value, onPress, divided = false }: SettingsRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={value === undefined ? undefined : { text: value }}
      onPress={onPress}
      style={[styles.row, divided && styles.divided]}
    >
      <Text style={[typography.bodyRow, styles.label]}>{label}</Text>
      {value !== undefined && (
        <Text style={[typography.bodyM, { color: colors.textSecondary }]}>{value}</Text>
      )}
      <Icon name="chevron" size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

/** Figma «Lista»: the card that groups the rows. */
export function SettingsGroup({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 10,
  },
  divided: { borderTopWidth: 1, borderTopColor: colors.borderHair },
  label: { flex: 1, color: colors.textPrimary },
  group: {
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
});
