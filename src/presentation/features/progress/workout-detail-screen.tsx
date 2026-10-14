import { useEffect, useEffectEvent } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Id } from '@/domain/models/vocabulary';
import type { DetailExercise, WorkoutDetail } from '@/domain/usecases/observe-workout-detail';
import { Badge } from '@/presentation/components/badge/badge';
import { Button } from '@/presentation/components/button/button';
import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { TopBar } from '@/presentation/components/navigation/top-bar';
import { BottomSheet, MenuItem } from '@/presentation/components/overlay/bottom-sheet';
import { Dialog } from '@/presentation/components/overlay/dialog';
import { Text } from '@/presentation/components/text';
import {
  useWorkoutDetailViewModel,
  type WorkoutDetailViewModel,
} from '@/presentation/features/progress/use-workout-detail-view-model';
import { RecordCard } from '@/presentation/features/summary/record-card';
import { SetRow } from '@/presentation/features/workout/set-row';
import { SetSheet } from '@/presentation/features/workout/set-sheet';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { dialogs } from '@/presentation/strings/dialogs';
import { home } from '@/presentation/strings/home';
import { longDate } from '@/presentation/strings/numbers';
import { progress } from '@/presentation/strings/progress';
import { colors, radius, space, typography } from '@/presentation/theme';

const text = progress.workoutDetail;

interface WorkoutDetailScreenProps {
  workoutId: Id;
  /** Back, or the workout is gone: to S18. */
  onClose: () => void;
}

/**
 * S19 · Detalle de entrenamiento (RF-PROG-02, RF-PROG-03, Figma «S19 · Detalle», «Edición»,
 * «Editar serie» and «D16»). Reading first; the pencil opens the edit of the past.
 */
export function WorkoutDetailScreen({ workoutId, onClose }: WorkoutDetailScreenProps) {
  const viewModel = useWorkoutDetailViewModel(workoutId);
  const { state, editing, actions } = viewModel;
  const insets = useSafeAreaInsets();

  // The route's callback is a new function on every render: only the status matters.
  const leave = useEffectEvent(() => onClose());
  const missing = state.status === 'missing';
  useEffect(() => {
    if (missing) leave();
  }, [missing]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <TopBar
        title={editing ? text.edit : text.title}
        backLabel={common.back}
        onBack={editing ? actions.finishEditing : onClose}
        action={
          state.status !== 'content'
            ? undefined
            : editing
              ? { icon: 'dots', label: text.menu, onPress: actions.openMenu }
              : { icon: 'edit', label: text.edit, onPress: actions.startEditing }
        }
      />
      {state.status === 'error' && (
        <View style={styles.message}>
          <EmptyState icon="alert" title={home.readError.title} body={home.readError.body} />
        </View>
      )}
      {state.status === 'content' && (
        <Detail viewModel={viewModel} detail={state.detail} bottomInset={insets.bottom} />
      )}
    </View>
  );
}

function Detail({
  viewModel,
  detail,
  bottomInset,
}: {
  viewModel: WorkoutDetailViewModel;
  detail: WorkoutDetail;
  bottomInset: number;
}) {
  const { editing, sheet, confirm, actions } = viewModel;
  const setSheet = sheet?.kind === 'edit' || sheet?.kind === 'adjust' ? sheet : null;

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[typography.titleL, { color: colors.textPrimary }]}>
            {progress.overview.workoutTitle(detail.dayName, detail.routineName)}
          </Text>
          <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
            {text.meta(longDate(detail.finishedAt), detail.minutes, detail.sets)}
          </Text>
        </View>
        {editing && (
          <Text style={[typography.bodyS, { color: colors.textSecondary }]}>{text.editHelp}</Text>
        )}
        {!editing &&
          detail.records.map((record, index) => (
            <RecordCard key={index} record={record} unit={detail.unit} />
          ))}
        {detail.exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.exercise.id}
            exercise={exercise}
            detail={detail}
            editing={editing}
            onOpenSet={(setId) => actions.openSet(exercise.exercise.id, setId)}
            onAddSet={() => actions.addSet(exercise.exercise.id)}
          />
        ))}
      </ScrollView>
      {editing && (
        <View style={[styles.bottom, { paddingBottom: bottomInset + space.s8 }]}>
          <Button variant="primary" size="xl" label={text.done} onPress={actions.finishEditing} />
        </View>
      )}
      {setSheet && (
        <SetSheet
          sheet={setSheet}
          exercise={setSheet.exercise}
          setNumber={setSheet.number}
          setTotal={Math.max(setSheet.exercise.exercise.prescription.sets, setSheet.number)}
          effortMode={detail.effortMode}
          onChange={actions.editForm}
          onConfirm={() => void actions.save()}
          onDelete={actions.askDeleteSet}
          onClose={actions.closeSheet}
        />
      )}
      <BottomSheet
        visible={sheet?.kind === 'menu'}
        title={text.edit}
        closeLabel={common.close}
        onClose={actions.closeSheet}
      >
        <MenuItem icon="trash" label={text.delete} destructive onPress={actions.askDeleteWorkout} />
      </BottomSheet>
      <Dialog
        visible={confirm !== null}
        title={dialogs.D16.title(confirm?.target ?? 'set')}
        body={dialogs.D16.body(
          confirm?.target ?? 'set',
          confirm?.target === 'workout' ? confirm.sets : undefined,
        )}
        actions={[
          { label: dialogs.D16.cancel, kind: 'safe', onPress: actions.closeConfirm },
          {
            label: dialogs.D16.deleteDestructive,
            kind: 'destructive',
            onPress: () => void actions.confirmDelete(),
          },
        ]}
        onDismiss={actions.closeConfirm}
      />
    </>
  );
}

/** An exercise with its sets: substitutes and skipped ones marked (RF-PROG-02.AC1). */
function ExerciseCard({
  exercise,
  detail,
  editing,
  onOpenSet,
  onAddSet,
}: {
  exercise: DetailExercise;
  detail: WorkoutDetail;
  editing: boolean;
  onOpenSet: (setId: Id) => void;
  onAddSet: () => void;
}) {
  const { sets, status } = exercise.exercise;
  return (
    <View style={styles.card}>
      <Text style={[typography.titleM, { color: colors.textPrimary }]}>
        {exercise.name ?? catalog.detail.unavailable}
      </Text>
      {exercise.plannedName !== null && (
        <View style={styles.badge}>
          <Badge label={text.substitutes(exercise.plannedName)} tone="inverse" />
        </View>
      )}
      {status === 'skipped' && sets.length === 0 && (
        <Text style={[typography.bodyS, { color: colors.textSecondary }]}>{text.skipped}</Text>
      )}
      {sets.map((set, index) => (
        <SetRow
          key={set.id}
          row={{ kind: 'done', number: index + 1, set, askEffort: false, missingEffort: false }}
          unit={exercise.grid === null ? null : detail.unit}
          effortMode={detail.effortMode}
          onPress={() => onOpenSet(set.id)}
          onEffort={() => {}}
        />
      ))}
      {editing && (
        <View style={styles.add}>
          <Button variant="tertiary" label={text.addSet} onPress={onAddSet} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  message: { padding: space.s16 },
  content: { gap: space.s12, paddingHorizontal: space.s16, paddingBottom: space.s24 },
  header: { gap: 4, paddingLeft: space.s4 },
  card: {
    gap: space.s8,
    padding: space.s12,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  badge: { flexDirection: 'row' },
  add: { alignItems: 'center' },
  bottom: {
    paddingTop: space.s10,
    paddingHorizontal: space.s16,
    borderTopWidth: 1,
    borderTopColor: colors.borderHair,
  },
});
