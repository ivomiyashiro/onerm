import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/presentation/components/icons/icon';
import { colors, elevation, radius, size, typography } from '@/presentation/theme';

interface SearchFieldProps {
  /** Accessibility label and placeholder. */
  label: string;
  /** Accessibility label of the ✕ button. */
  clearLabel: string;
  value: string;
  onChangeText: (text: string) => void;
}

/** Figma «SearchField»: 52 dp pill with the search icon, lime ring on focus and a ✕ to clear. */
export function SearchField({ label, clearLabel, value, onChangeText }: SearchFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.box, focused && styles.focused]}>
      <Icon name="search" size={20} color={colors.textSecondary} />
      <TextInput
        accessibilityLabel={label}
        placeholder={label}
        placeholderTextColor={colors.textPlaceholder}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        selectionColor={colors.textAccent}
        style={[typography.bodyL, styles.input]}
      />
      {value.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          onPress={() => onChangeText('')}
          style={styles.clear}
        >
          <Icon name="x" size={20} color={colors.textPrimary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingLeft: 16,
    paddingRight: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderControl,
    backgroundColor: colors.bgField,
  },
  focused: { borderColor: colors.borderAccent, ...elevation.focusAccent },
  input: { flex: 1, padding: 0, color: colors.textPrimary },
  clear: {
    width: size.targetMin,
    height: size.targetMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
});
