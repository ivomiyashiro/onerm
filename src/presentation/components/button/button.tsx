import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { PrimaryPlate } from '@/presentation/components/button/primary-plate';
import { Icon, type IconName } from '@/presentation/components/icons/icon';
import { Spinner } from '@/presentation/components/icons/spinner';
import { colors, elevation, radius, typography } from '@/presentation/theme';
import { Text } from '@/presentation/components/text';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'dangerSolid';

interface ButtonProps {
  variant: ButtonVariant;
  label: string;
  onPress: () => void;
  /** xl: the workout actions ("Hecho"). Only primary and secondary have it. */
  size?: 'm' | 'xl';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  /** Shown next to the spinner while loading (for example "Guardando…"). */
  loadingLabel?: string;
  accessibilityHint?: string;
}

/**
 * Figma «Button». Primary: the cut plate with the brand stripes, uppercase, one per screen.
 * Secondary: grey fill. Tertiary: underlined text. Danger: red text; dangerSolid: red tint.
 */
export function Button({
  variant,
  label,
  onPress,
  size = 'm',
  icon,
  disabled = false,
  loading = false,
  loadingLabel,
  accessibilityHint,
}: ButtonProps) {
  const text = loading && loadingLabel ? loadingLabel : label;
  const inactive = disabled || loading;
  const foreground = disabled ? colors.textTertiary : FOREGROUND[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        SHAPE[variant][size],
        background(variant, { pressed, disabled }),
      ]}
    >
      {variant === 'primary' && <PrimaryPlate size={size} disabled={disabled} />}
      {loading && <Spinner color={foreground} />}
      <View style={variant === 'tertiary' && styles.underlined}>
        <Text style={[labelStyle(variant, size), { color: foreground }]}>{text}</Text>
      </View>
      {icon && !loading && (
        <View testID="button-icon">
          <Icon name={icon} size={20} color={foreground} />
        </View>
      )}
    </Pressable>
  );
}

const FOREGROUND: Record<ButtonVariant, string> = {
  primary: colors.textOnAccent,
  secondary: colors.textPrimary,
  tertiary: colors.textPrimary,
  danger: colors.textErr,
  dangerSolid: colors.textErr,
};

function labelStyle(variant: ButtonVariant, size: 'm' | 'xl') {
  if (variant !== 'primary') return typography.buttonDefault;
  return size === 'xl' ? typography.buttonPrimaryXl : typography.buttonPrimary;
}

function background(
  variant: ButtonVariant,
  { pressed, disabled }: { pressed: boolean; disabled: boolean },
): ViewStyle {
  switch (variant) {
    case 'primary':
      return pressed ? styles.pressedPlate : {};
    case 'secondary':
      return pressed || disabled
        ? { backgroundColor: colors.bgField }
        : { backgroundColor: colors.bgRaised, ...elevation.surfaceHighlightStrong };
    case 'tertiary':
      return pressed ? { backgroundColor: colors.bgField } : {};
    case 'danger':
      return pressed ? { backgroundColor: colors.bgErrSoft } : {};
    case 'dangerSolid':
      if (disabled) return { backgroundColor: colors.bgField };
      return { backgroundColor: pressed ? colors.bgErrSoft : colors.bgErrSoftStrong };
  }
}

const full = (height: number, borderRadius: number): ViewStyle => ({
  minHeight: height,
  paddingHorizontal: 22,
  borderRadius,
  alignSelf: 'stretch',
});
const compact: ViewStyle = { minHeight: 48, paddingHorizontal: 14, borderRadius: radius.lg };

const SHAPE: Record<ButtonVariant, Record<'m' | 'xl', ViewStyle>> = {
  primary: { m: full(56, 0), xl: full(64, 0) },
  secondary: { m: full(56, radius.lg), xl: full(64, 18) },
  tertiary: { m: compact, xl: compact },
  danger: { m: compact, xl: compact },
  dangerSolid: { m: full(56, radius.lg), xl: full(56, radius.lg) },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  // Figma has no pressed look for the plate: it sinks slightly ("presión" motion token).
  pressedPlate: { transform: [{ scale: 0.98 }] },
  underlined: {
    paddingTop: 4,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderControl,
  },
});
