import { useState, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Icon, type IconName } from '@/presentation/components/icons/icon';
import { colors, elevation, radius, size, typography } from '@/presentation/theme';
import { Text } from '@/presentation/components/text';

interface TrailingAction {
  icon: IconName;
  /** The accessible name; it changes with the state (RNF-18). */
  label: string;
  onPress: () => void;
}

interface TextFieldProps extends Pick<
  TextInputProps,
  | 'placeholder'
  | 'keyboardType'
  | 'autoComplete'
  | 'autoCapitalize'
  | 'secureTextEntry'
  | 'returnKeyType'
  | 'onSubmitEditing'
  | 'submitBehavior'
> {
  /** To move the focus here from the previous field's «Siguiente» (#270). */
  ref?: Ref<TextInput>;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  help?: string;
  /** Replaces the help text while there is an error. */
  error?: string;
  disabled?: boolean;
  /** An icon button inside the box, at the end (the eye of a password field). */
  trailingAction?: TrailingAction;
}

/** Figma «Input»: 52 dp field, lime border and ring on focus, red border and message on error. */
export function TextField({
  label,
  value,
  onChangeText,
  help,
  error,
  disabled = false,
  trailingAction,
  ref,
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
          ref={ref}
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
        {trailingAction !== undefined && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={trailingAction.label}
            onPress={trailingAction.onPress}
            disabled={disabled}
            hitSlop={{ right: 16 }}
            style={styles.action}
          >
            <Icon name={trailingAction.icon} size={24} color={colors.textSecondary} />
          </Pressable>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderControl,
    backgroundColor: colors.bgField,
  },
  focused: { borderColor: colors.borderAccent, ...elevation.focusAccent },
  error: { borderColor: colors.borderErr, ...elevation.focusError },
  disabled: { borderStyle: 'dashed', backgroundColor: 'transparent' },
  // The whole box is tappable, not only the line of text (RNF-16).
  // #194: without the type's line height, which on iOS pushed the line down; centered.
  input: {
    flex: 1,
    padding: 0,
    minHeight: size.targetMin,
    lineHeight: undefined,
    textAlignVertical: 'center',
  },
  action: {
    minWidth: size.targetMin,
    minHeight: size.targetMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
