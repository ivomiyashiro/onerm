import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/presentation/components/text';
import { colors, radius, typography } from '@/presentation/theme';

interface SegmentedProps<T extends string | number> {
  options: readonly { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
  /** The accessible name of the group: the field's label. */
  label: string;
}

/** Figma «Segmented» and the RIR options of S15: one choice, the chosen one in soft lime. */
export function Segmented<T extends string | number>({
  options,
  selected,
  onSelect,
  label,
}: SegmentedProps<T>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group}>
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: isSelected }}
            onPress={() => onSelect(option.value)}
            style={[styles.segment, isSelected && styles.selected]}
          >
            <Text
              style={[
                typography.bodyMStrong,
                { color: isSelected ? colors.textAccent : colors.textSecondary },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    height: 56,
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgField,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selected: { borderColor: colors.borderAccentSoft, backgroundColor: colors.bgAccentSoft },
});
