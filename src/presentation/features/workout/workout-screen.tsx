import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/presentation/components/badge/badge';
import { Button } from '@/presentation/components/button/button';
import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { Snackbar } from '@/presentation/components/feedback/snackbar';
import { Icon } from '@/presentation/components/icons/icon';
import { BottomSheet, MenuItem } from '@/presentation/components/overlay/bottom-sheet';
import { Text } from '@/presentation/components/text';
import { remainingSets } from '@/domain/rules/workout/remaining-sets';
import { SetRow } from '@/presentation/features/workout/set-row';
import { SetSheet } from '@/presentation/features/workout/set-sheet';
import { useElapsed } from '@/presentation/features/workout/use-elapsed';
import {
  useWorkoutViewModel,
  type WorkoutContent,
  type WorkoutViewModel,
} from '@/presentation/features/workout/use-workout-view-model';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { home } from '@/presentation/strings/home';
import { routines } from '@/presentation/strings/routines';
import { workout as text } from '@/presentation/strings/workout';
import { colors, radius, space, typography } from '@/presentation/theme';

/** A short pulse when a set is logged (RF-ENT-02.AC1). */
const LOGGED_VIBRATION_MS = 30;

interface WorkoutScreenProps {
  /** No workout in progress any more: back to the tabs. */
  onClose: () => void;
}

/** S09 · Entrenamiento en curso (08 §5): the current exercise, its sets and «Hecho». */
export function WorkoutScreen({ onClose }: WorkoutScreenProps) {
  const viewModel = useWorkoutViewModel();
  const { state } = viewModel;
  const insets = useSafeAreaInsets();
  const none = state.status === 'none';

  useEffect(() => {
    if (none) onClose();
  }, [none, onClose]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {state.status === 'content' && (
        <Workout viewModel={viewModel} content={state} bottomInset={insets.bottom} />
      )}
      {state.status === 'error' && (
        <View style={styles.message}>
          <EmptyState icon="alert" title={home.readError.title} body={home.readError.body} />
        </View>
      )}
    </View>
  );
}

function Workout({
  viewModel,
  content,
  bottomInset,
}: {
  viewModel: WorkoutViewModel;
  content: WorkoutContent;
  bottomInset: number;
}) {
  const { sheet, deleted, actions } = viewModel;
  const { exercise, exercises, exerciseIndex, rows, effortMode } = content;
  const time = useElapsed(content.startedAt);
  const unit = exercise.grid?.unit ?? null;
  const name = exercise.name ?? catalog.detail.unavailable;
  const { prescription } = exercise.exercise;
  const currentNumber = rows.find((r) => r.kind === 'current')?.number ?? rows.length;

  async function done() {
    if ((await actions.done()) === 'logged') Vibration.vibrate(LOGGED_VIBRATION_MS);
  }
  async function confirm() {
    if (sheet?.kind === 'edit') return actions.saveEdit();
    if ((await actions.confirmAdjust()) === 'logged') Vibration.vibrate(LOGGED_VIBRATION_MS);
  }

  return (
    <>
      <View style={styles.header}>
        <Text style={[typography.bodyLStrong, { color: colors.textPrimary }]}>
          {content.dayName}
        </Text>
        <Text style={[typography.monoS, { color: colors.textSecondary }]}>{time}</Text>
      </View>
      <View style={styles.progress}>
        {exercises.map((e, index) => (
          <View
            key={e.exercise.id}
            style={[
              styles.segment,
              index === exerciseIndex
                ? styles.segmentCurrent
                : remainingSets(e.exercise) === 0
                  ? styles.segmentDone
                  : styles.segmentTodo,
            ]}
          />
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.title}>
          <Text
            style={[typography.titleL, styles.flex, { color: colors.textPrimary }]}
            accessibilityRole="header"
          >
            {name}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={text.workoutMenu.title}
            onPress={actions.openExerciseMenu}
            style={styles.iconButton}
          >
            <Icon name="dots" color={colors.textPrimary} />
          </Pressable>
        </View>
        <View style={styles.facts}>
          <Badge
            label={text.set.prescription(
              prescription.sets,
              routines.repRange(prescription.repRange),
            )}
            tone="inverse"
          />
          {exercise.exercise.isUnilateral && <Badge label={text.set.unilateral} />}
          <Text style={[typography.bodyS, styles.flex, { color: colors.textSecondary }]}>
            {text.header.exerciseOf(exerciseIndex + 1, exercises.length)}
          </Text>
          <Button variant="tertiary" label={text.header.seeAll} onPress={actions.openExercises} />
        </View>
        {exercise.notes && (
          <Text style={[typography.bodyM, { color: colors.textSecondary }]}>{exercise.notes}</Text>
        )}
        {exercise.name === null && (
          <Text style={[typography.bodyM, { color: colors.textSecondary }]}>
            {text.unavailable.body}
          </Text>
        )}
        <View style={styles.rows}>
          {rows.map((row) => (
            <SetRow
              key={row.kind === 'done' ? row.set.id : `pending-${row.number}`}
              row={row}
              unit={unit}
              effortMode={effortMode}
              onPress={() =>
                row.kind === 'done' ? actions.openSet(row.set.id) : actions.openAdjust()
              }
              onEffort={(set, field, rir) => void actions.chooseEffort(set, field, rir)}
            />
          ))}
        </View>
      </ScrollView>
      <View style={[styles.bottom, { paddingBottom: bottomInset + space.s8 }]}>
        {deleted && (
          <Snackbar
            message={text.setDeleted.message}
            action={{ label: text.setDeleted.undo, onPress: () => void actions.undo() }}
            onDismiss={actions.dismissUndo}
          />
        )}
        {content.primary === 'done' && (
          <Button
            variant="primary"
            size="xl"
            label={text.primaryAction.done}
            icon="check"
            onPress={() => void done()}
          />
        )}
        {content.primary === 'nextExercise' && (
          <Button
            variant="primary"
            size="xl"
            label={text.primaryAction.nextExercise}
            icon="arrow"
            onPress={actions.nextExercise}
          />
        )}
      </View>
      <SetSheet
        sheet={sheet?.kind === 'adjust' || sheet?.kind === 'edit' ? sheet : null}
        exercise={exercise}
        setNumber={currentNumber}
        setTotal={Math.max(prescription.sets, currentNumber)}
        effortMode={effortMode}
        onChange={actions.editForm}
        onConfirm={() => void confirm()}
        onDelete={() => void actions.deleteSet()}
        onClose={actions.closeSheet}
      />
      <BottomSheet
        visible={sheet?.kind === 'exercises'}
        title={text.exerciseList.title}
        subtitle={text.exerciseList.subtitle(content.dayName, exerciseIndex + 1, exercises.length)}
        closeLabel={common.close}
        onClose={actions.closeSheet}
      >
        {exercises.map((e, index) => {
          const logged = e.exercise.sets.filter((s) => !s.isWarmup).length;
          return (
            <Pressable
              key={e.exercise.id}
              accessibilityRole="button"
              accessibilityLabel={e.name ?? catalog.detail.unavailable}
              accessibilityState={{ selected: index === exerciseIndex }}
              onPress={() => actions.goTo(index)}
              style={[styles.listRow, index === exerciseIndex && styles.listRowCurrent]}
            >
              <Text style={[typography.bodyRow, styles.flex, { color: colors.textPrimary }]}>
                {e.name ?? catalog.detail.unavailable}
              </Text>
              <Text style={[typography.monoS, { color: colors.textSecondary }]}>
                {text.exerciseList.progress(
                  Math.min(logged, e.exercise.prescription.sets),
                  e.exercise.prescription.sets,
                )}
              </Text>
            </Pressable>
          );
        })}
      </BottomSheet>
      <BottomSheet
        visible={sheet?.kind === 'exerciseMenu'}
        title={name}
        closeLabel={common.close}
        onClose={actions.closeSheet}
      >
        <MenuItem icon="plus" label={text.exerciseMenu.addSet} onPress={actions.addSet} />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  message: { padding: space.s16 },
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
  content: {
    gap: space.s10,
    paddingTop: space.s12,
    paddingHorizontal: space.s16,
    paddingBottom: space.s24,
  },
  title: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: space.s4 },
  flex: { flex: 1 },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  facts: { flexDirection: 'row', alignItems: 'center', gap: space.s8, paddingLeft: space.s4 },
  rows: { gap: space.s8 },
  bottom: {
    gap: space.s8,
    paddingTop: space.s16,
    paddingHorizontal: space.s16,
    backgroundColor: colors.bgBase,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s10,
    minHeight: 56,
    paddingHorizontal: space.s12,
    borderRadius: radius.lg,
  },
  listRowCurrent: { backgroundColor: colors.bgCurrent },
});
