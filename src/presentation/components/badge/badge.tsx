import { StyleSheet, View } from 'react-native';

import { Text } from '@/presentation/components/text';
import { colors, radius, typography } from '@/presentation/theme';

interface BadgeProps {
  label: string;
  /** Inverse highlights it (the primary muscles in S17). */
  tone?: 'neutral' | 'inverse';
  testID?: string;
}

/** Figma «Badge» without the dot: a 26 dp label for a fact (equipment, muscle, unilateral). */
export function Badge({ label, tone = 'neutral', testID }: BadgeProps) {
  const inverse = tone === 'inverse';
  return (
    <View testID={testID} style={[styles.badge, inverse && styles.inverse]}>
      <Text
        style={[typography.tab, { color: inverse ? colors.textOnInverse : colors.textSecondary }]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    height: 26,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: radius.full,
    backgroundColor: colors.bgRaised,
  },
  inverse: { backgroundColor: colors.bgInverse },
});
