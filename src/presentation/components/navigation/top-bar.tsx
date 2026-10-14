import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/presentation/components/icons/icon';
import { Text } from '@/presentation/components/text';
import { colors, radius, size, typography } from '@/presentation/theme';

interface TopBarProps {
  title: string;
  /** Accessibility label of the back button. */
  backLabel: string;
  onBack: () => void;
  /** An icon button on the right (S19: edit, or its menu). */
  action?: { icon: IconName; label: string; onPress: () => void };
}

/** Figma «TopBar» (Back): 56 dp, a 48 dp back button and the screen title. */
export function TopBar({ title, backLabel, onBack, action }: TopBarProps) {
  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        onPress={onBack}
        style={styles.back}
      >
        <Icon name="back" size={20} color={colors.textPrimary} />
      </Pressable>
      <Text style={[typography.titleL, styles.title]} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      {action && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={styles.back}
        >
          <Icon name={action.icon} size={20} color={colors.textPrimary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 56,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 8,
  },
  back: {
    width: size.targetMin,
    height: size.targetMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  title: { flex: 1, color: colors.textPrimary },
});
