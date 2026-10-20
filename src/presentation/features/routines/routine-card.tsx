import { Pressable, StyleSheet, View } from 'react-native';

import { Badge } from '@/presentation/components/badge/badge';
import type { SwipeA11y } from '@/presentation/components/list/swipe-row';
import { Text } from '@/presentation/components/text';
import { colors, radius, typography } from '@/presentation/theme';

interface RoutineCardProps {
  name: string;
  summary: string;
  /** «Rutina activa» or «Recomendada para vos». */
  label?: string;
  /** The active routine: state background and soft lime border (S13 «Rutina activa destacada»). */
  highlighted?: boolean;
  /** Opens the card: a template's detail, or an own routine in the editor. */
  onPress?: () => void;
  /** An own routine's swipe actions, for screen readers too (#198, #254). */
  a11y?: SwipeA11y;
}

/** Figma «RoutineCard» (S13): a routine or a template. */
export function RoutineCard({
  name,
  summary,
  label,
  highlighted = false,
  onPress,
  a11y,
}: RoutineCardProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={a11y && [name, summary, label].filter(Boolean).join(', ')}
      {...a11y}
      onPress={onPress}
      disabled={onPress === undefined}
      style={[styles.card, highlighted && styles.highlighted]}
    >
      <Text style={[typography.titleM, styles.name]}>{name}</Text>
      <Text style={[typography.bodyM, { color: colors.textSecondary }]}>{summary}</Text>
      {label && (
        <View style={styles.label}>
          <Badge label={label} tone="inverse" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
    paddingTop: 12,
    paddingBottom: 16,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  highlighted: { borderColor: colors.borderAccentSoft, backgroundColor: colors.bgCurrent },
  name: { color: colors.textPrimary },
  label: { flexDirection: 'row' },
});
