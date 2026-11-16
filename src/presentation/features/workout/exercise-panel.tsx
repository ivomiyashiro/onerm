import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { Badge } from '@/presentation/components/badge/badge';
import { Button } from '@/presentation/components/button/button';
import { Icon } from '@/presentation/components/icons/icon';
import { SwipeRow, type SwipeA11y } from '@/presentation/components/list/swipe-row';
import { Text } from '@/presentation/components/text';
import { ReasonRow } from '@/presentation/features/workout/reason-row';
import { useExerciseSwipe } from '@/presentation/features/workout/use-exercise-swipe';
import type {
  WorkoutContent,
  WorkoutViewModel,
} from '@/presentation/features/workout/use-workout-view-model';
import { SetRow } from '@/presentation/shared/set/set-row';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { routines } from '@/presentation/strings/routines';
import { workout as text } from '@/presentation/strings/workout';
import { colors, space, typography } from '@/presentation/theme';

/**
 * The current exercise and its sets: swiping changes the exercise, without wrapping; screen
 * readers use «Ver todos» (08 §5, #258).
 */
export function ExercisePanel({
  content,
  actions,
}: {
  content: WorkoutContent;
  actions: WorkoutViewModel['actions'];
}) {
  const { exercise, exercises, exerciseIndex, rows, effortMode } = content;
  const unit = exercise.grid?.unit ?? null;
  const name = exercise.name ?? catalog.detail.unavailable;
  const { prescription } = exercise.exercise;
  const swipe = useExerciseSwipe({
    exerciseIndex,
    count: exercises.length,
    goTo: actions.goTo,
  });
  return (
    <GestureDetector gesture={swipe.gesture}>
      <Animated.View style={[styles.flex, swipe.style]} {...swipe.capture}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.title}>
            <Text
              style={[typography.titleL, styles.flex, { color: colors.textPrimary }]}
              accessibilityRole="header"
            >
              {name}
            </Text>
            {/* RF-CAT-02 AC7: ⓘ opens S26 «Cómo se hace». Next to the swap, so it stays put
                  whatever the length of the name. */}
            {exercise.catalog !== null && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={catalog.detail.howToOf(name)}
                onPress={actions.openHowTo}
                style={styles.iconButton}
              >
                <Icon name="info" color={colors.textPrimary} />
              </Pressable>
            )}
            {/* #222: no exercise menu. Skipping is moving on; adding a set is under the list. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={text.exercise.substitute(name)}
              onPress={actions.openSubstitute}
              style={styles.iconButton}
            >
              <Icon name="swap" color={colors.textPrimary} />
            </Pressable>
          </View>
          {exercise.plannedName !== null && (
            <Text style={[typography.bodyM, { color: colors.textSecondary }]}>
              {text.substitution.insteadOf(exercise.plannedName)}
            </Text>
          )}
          <View style={styles.facts}>
            <Badge
              label={text.set.prescription(
                prescription.sets,
                routines.repRange(prescription.repRange),
              )}
              tone="inverse"
            />
            {exercise.exercise.isUnilateral && <Badge label={text.set.unilateral} />}
            {exercise.plannedName !== null && <Badge label={text.substitution.substitute} />}
            {content.skipped && <Badge label={text.exerciseList.skipped} />}
            <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
              {text.header.exerciseOf(exerciseIndex + 1, exercises.length)}
            </Text>
            <View style={styles.seeAll}>
              <Button
                variant="tertiary"
                label={text.header.seeAll}
                onPress={actions.openExercises}
              />
            </View>
          </View>
          {exercise.notes && (
            <Text style={[typography.bodyM, { color: colors.textSecondary }]}>
              {exercise.notes}
            </Text>
          )}
          <ReasonRow
            line={content.reason.line}
            icon={content.reason.icon}
            onWhy={actions.openWhy}
          />
          {exercise.name === null && (
            <Text style={[typography.bodyM, { color: colors.textSecondary }]}>
              {text.unavailable.body}
            </Text>
          )}
          <View style={styles.rows}>
            {rows.map((row) => {
              const setRow = (a11y?: SwipeA11y) => (
                <SetRow
                  row={row}
                  unit={unit}
                  effortMode={effortMode}
                  onPress={() =>
                    row.kind === 'done' ? actions.openSet(row.set.id) : actions.openAdjust()
                  }
                  onEffort={(set, field, rir) => void actions.chooseEffort(set, field, rir)}
                  a11y={a11y}
                />
              );
              // RF-ENT-05.AC2: a set added with «Agregar serie» is taken back swiping it, with
              // nothing to confirm: it isn't logged. The prescribed ones stay (RF-ENT-05.AC1).
              if (row.kind !== 'done' && row.extra)
                return (
                  <SwipeRow
                    key={`extra-${row.number}`}
                    testID={`set ${row.number}`}
                    actions={[
                      {
                        key: 'remove',
                        label: common.swipe.remove,
                        icon: 'trash',
                        destructive: true,
                        onPress: actions.removeSet,
                      },
                    ]}
                  >
                    {setRow}
                  </SwipeRow>
                );
              if (row.kind !== 'done') return <View key={`pending-${row.number}`}>{setRow()}</View>;
              // #198, #254: a done set is deleted (with «Deshacer») swiping it; tapping it edits it.
              return (
                <SwipeRow
                  key={row.set.id}
                  testID={`set ${row.number}`}
                  actions={[
                    {
                      key: 'delete',
                      label: common.swipe.delete,
                      icon: 'trash',
                      destructive: true,
                      onPress: () => void actions.deleteSet(row.set.id),
                    },
                  ]}
                >
                  {setRow}
                </SwipeRow>
              );
            })}
          </View>
          {/* RF-ENT-05.AC1: one more set, preloaded with the values of the last one. */}
          <View style={styles.addSet}>
            <Button
              variant="tertiary"
              label={text.exercise.addSet}
              icon="plus"
              onPress={actions.addSet}
            />
          </View>
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    gap: space.s10,
    paddingTop: space.s12,
    paddingHorizontal: space.s16,
    paddingBottom: space.s24,
  },
  title: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: space.s4 },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: space.s8,
    paddingLeft: space.s4,
  },
  seeAll: { marginLeft: 'auto' },
  rows: { gap: space.s8 },
  addSet: { alignSelf: 'center' },
});
