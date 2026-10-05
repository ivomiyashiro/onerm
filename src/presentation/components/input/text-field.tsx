import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Icon } from '@/presentation/components/icons/icon';
import { colors, elevation, radius, typography } from '@/presentation/theme';
import { Text } from '@/presentation/components/text';

interface TextFieldProps extends Pick<
  TextInputProps,
  'placeholder' | 'keyboardType' | 'autoComplete' | 'autoCapitalize' | 'secureTextEntry'
> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  help?: string;
  /** Replaces the help text while there is an error. */
  error?: string;
  disabled?: boolean;
}

/** Figma «Input»: 52 dp field, lime border and ring on focus, red border and message on error. */
export function TextField({
  label,
  value,
  onChangeText,
  help,
  error,
  disabled = false,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={[typography.bodyMStrong, { color: colors.textPrimary }]}>{label}</Text>
      <View
        testID="text-field-box"
        style={[
          styles.box,
          focused && styles.focused,
          error !== undefined && styles.error,
          disabled && styles.disabled,
        ]}
      >
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          // The help or the error is read whenever the field gets focus, not only when it appears.
          accessibilityHint={error ?? help}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          aria-disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={colors.textPlaceholder}
          selectionColor={colors.textAccent}
          style={[
            typography.bodyL,
            styles.input,
            { color: disabled ? colors.textSecondary : colors.textPrimary },
          ]}
        />
      </View>
      {error !== undefined ? (
        <View style={styles.message}>
          <Icon name="alert" size={16} color={colors.textErr} />
          <Text
            style={[typography.bodyS, { color: colors.textErr }]}
            accessibilityLiveRegion="polite"
          >
            {error}
          </Text>
        </View>
      ) : (
        help && <Text style={[typography.bodyS, { color: colors.textSecondary }]}>{help}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch', gap: 8 },
  box: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderControl,
    backgroundColor: colors.bgField,
  },
  focused: { borderColor: colors.borderAccent, ...elevation.focusAccent },
  error: { borderColor: colors.borderErr, ...elevation.focusError },
  disabled: { borderStyle: 'dashed', backgroundColor: 'transparent' },
  input: { padding: 0 },
  message: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
