import { Pressable, StyleSheet, View } from 'react-native';

import type { Exercise } from '@/domain/models/exercise';
import { Icon } from '@/presentation/components/icons/icon';
import { Text } from '@/presentation/components/text';
import { catalog } from '@/presentation/strings/catalog';
import { colors, radius, typography } from '@/presentation/theme';

/** "Pecho · Máquina": the first primary muscle and the primary equipment. */
function exerciseSummary(exercise: Exercise): string {
  const muscle = exercise.primaryMuscles[0];
  return [muscle && catalog.muscles[muscle], catalog.equipment[exercise.primaryEquipment]]
    .filter(Boolean)
    .join(' · ');
}

/** Figma «ExerciseResult»: a search result (S16). Pressing it opens the detail (S17). */
export function ExerciseRow({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
  const summary = exerciseSummary(exercise);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={exercise.name}
      accessibilityHint={summary}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.tile}>
        <Icon name="dumbbell" size={20} color={colors.textSecondary} />
      </View>
      <View style={styles.texts}>
        <Text style={[typography.bodyRow, { color: colors.textPrimary }]}>{exercise.name}</Text>
        <Text style={[typography.bodyS, { color: colors.textSecondary }]}>{summary}</Text>
      </View>
      <View style={styles.chevron}>
        <Icon name="chevron" size={20} color={colors.textPrimary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: radius.md,
  },
  pressed: { backgroundColor: colors.bgCard },
  tile: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.bgRaised,
  },
  texts: { flex: 1, gap: 2 },
  chevron: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
