import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/presentation/components/text';
import { colors, typography } from '@/presentation/theme';

interface NumberSegmentsProps {
  values: readonly number[];
  selected: number;
  onSelect: (value: number) => void;
  /** The accessible name of the group, the question it answers. */
  label: string;
}

/** Figma S05 «Días»: one number of a short range, the chosen one inverted. */
export function NumberSegments({ values, selected, onSelect, label }: NumberSegmentsProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group}>
      {values.map((value) => {
        const isSelected = value === selected;
        return (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            onPress={() => onSelect(value)}
            style={[styles.segment, isSelected && styles.selected]}
          >
            <Text
              style={[
                typography.numberM,
                { color: isSelected ? colors.textOnInverse : colors.textSecondary },
              ]}
            >
              {String(value)}
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
    height: 64,
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgField,
  },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  selected: { backgroundColor: colors.bgInverse },
});
