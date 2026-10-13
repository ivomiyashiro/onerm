import { StyleSheet, View } from 'react-native';

import { colors } from '@/presentation/theme';

interface StepProgressProps {
  /** 1-based. */
  current: number;
  total: number;
}

/**
 * Figma «ProgressSegment» in a row: done steps filled, the current one outlined, the rest grey.
 * Decorative: «Paso {n} de 3» says the same in text.
 */
export function StepProgress({ current, total }: StepProgressProps) {
  return (
    <View
      style={styles.row}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            i + 1 < current && styles.done,
            i + 1 === current && styles.current,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 6, borderRadius: 6, backgroundColor: colors.bgRaised },
  done: { backgroundColor: colors.bgInverse },
  current: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.borderInverse },
});
