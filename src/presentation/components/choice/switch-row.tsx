import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/presentation/components/text';
import { colors, size, space, typography } from '@/presentation/theme';

interface SwitchRowProps {
  /** What TalkBack reads, and the visible text unless `children` replace it. */
  label: string;
  /** Read after the label: the help or the state of a permission. */
  help?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  /** The visible texts, when they are more than the label: they must start with the label. */
  children?: ReactNode;
}

/**
 * A text with a switch at the end, where the whole row is the switch, as in Android's settings
 * (RNF-16): React Native's Switch alone is 46 × 27 dp. The Switch is only drawn; the row is what
 * gets tapped and what TalkBack reads (RNF-18).
 */
export function SwitchRow({
  label,
  help,
  value,
  disabled = false,
  onChange,
  children,
}: SwitchRowProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={help}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={styles.row}
    >
      <View style={styles.texts}>
        {children ?? (
          <Text style={[typography.bodyM, { color: colors.textSecondary }]}>{label}</Text>
        )}
      </View>
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants">
        <Switch
          value={value}
          disabled={disabled}
          trackColor={{ false: colors.bgRaised, true: colors.bgAccent }}
          thumbColor={colors.textPrimary}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12, minHeight: size.targetMin },
  texts: { flex: 1, gap: 2 },
});
