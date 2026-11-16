import { Pressable, StyleSheet, View } from 'react-native';

import { remainingSets } from '@/domain/rules/workout/remaining-sets';
import { ElapsedText } from '@/presentation/components/clock/elapsed-text';
import { Icon } from '@/presentation/components/icons/icon';
import { Text } from '@/presentation/components/text';
import type { WorkoutContent } from '@/presentation/features/workout/use-workout-view-model';
import { workout as text } from '@/presentation/strings/workout';
import { colors, space, typography } from '@/presentation/theme';

/** The day with its running time and «…», then one segment per exercise (08 §5). */
export function WorkoutHeader({
  content,
  clockStartedAt,
  onOpenMenu,
}: {
  content: WorkoutContent;
  /** Null under the full-screen rest: nobody sees it, so it doesn't tick (#229). */
  clockStartedAt: Date | null;
  onOpenMenu: () => void;
}) {
  const { exercises, exerciseIndex } = content;
  return (
    <>
      <View style={styles.header}>
        <Text style={[typography.bodyLStrong, { color: colors.textPrimary }]}>
          {content.dayName}
        </Text>
        <ElapsedText
          startedAt={clockStartedAt}
          style={[typography.monoS, styles.flex, { color: colors.textSecondary }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={text.workoutMenu.title}
          onPress={onOpenMenu}
          style={styles.iconButton}
        >
          <Icon name="dots" color={colors.textPrimary} />
        </Pressable>
      </View>
      <View style={styles.progress}>
        {exercises.map((e, index) => (
          <View
            key={e.exercise.id}
            style={[
              styles.segment,
              index === exerciseIndex
                ? styles.segmentCurrent
                : remainingSets(e.exercise) === 0 && e.exercise.status !== 'skipped'
                  ? styles.segmentDone
                  : styles.segmentTodo,
            ]}
          />
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.s8,
    minHeight: 48,
    paddingTop: space.s12,
    paddingHorizontal: space.s20,
  },
  progress: { flexDirection: 'row', gap: 4, paddingTop: space.s10, paddingHorizontal: space.s20 },
  segment: { flex: 1, height: 6, borderRadius: 6 },
  segmentDone: { backgroundColor: colors.textPrimary },
  segmentCurrent: { borderWidth: 1.5, borderColor: colors.textPrimary },
  segmentTodo: { backgroundColor: colors.bgRaised },
  flex: { flex: 1 },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
