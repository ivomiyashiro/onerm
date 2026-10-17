import type { ReactNode } from 'react';
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
  /** Before the label, in its own colors: a logo such as Google's (#194). */
  leading?: ReactNode;
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
  leading,
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
      {loading ? <Spinner color={foreground} /> : leading}
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

// #194: one radius for every full-width button. The primary plate keeps its two cut corners and
// rounds the other two with it.
const BUTTON_RADIUS = radius.md;

const full = (height: number): ViewStyle => ({
  minHeight: height,
  paddingHorizontal: 22,
  borderRadius: BUTTON_RADIUS,
  alignSelf: 'stretch',
});
const compact: ViewStyle = { minHeight: 48, paddingHorizontal: 14, borderRadius: BUTTON_RADIUS };

const SHAPE: Record<ButtonVariant, Record<'m' | 'xl', ViewStyle>> = {
  primary: { m: { ...full(56), overflow: 'hidden' }, xl: { ...full(64), overflow: 'hidden' } },
  secondary: { m: full(56), xl: full(64) },
  tertiary: { m: compact, xl: compact },
  danger: { m: compact, xl: compact },
  dangerSolid: { m: full(56), xl: full(56) },
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
