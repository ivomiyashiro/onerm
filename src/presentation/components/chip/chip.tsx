import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/presentation/components/icons/icon';
import { Text } from '@/presentation/components/text';
import { colors, radius, size, typography } from '@/presentation/theme';

interface ChipProps {
  label: string;
  /** A filter chip has a state; without it the chip is an action ("Más filtros"). */
  selected?: boolean;
  onPress: () => void;
}

/** Figma «Chip»: 48 dp filter or multiple choice. Selected: soft lime with a check, not solid. */
export function Chip({ label, selected, onPress }: ChipProps) {
  const isToggle = selected !== undefined;
  return (
    <Pressable
      accessibilityRole={isToggle ? 'checkbox' : 'button'}
      accessibilityLabel={label}
      accessibilityState={isToggle ? { checked: selected } : undefined}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      {selected && <Icon name="check" size={16} color={colors.textAccent} />}
      <Text
        style={[
          typography.bodyMStrong,
          { color: selected ? colors.textAccent : colors.textPrimary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: size.targetMin,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgField,
  },
  selected: { borderColor: colors.borderAccentSoft, backgroundColor: colors.bgAccentSoft },
});
