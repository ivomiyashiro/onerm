import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/presentation/components/badge/badge';
import { Button } from '@/presentation/components/button/button';
import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { Snackbar } from '@/presentation/components/feedback/snackbar';
import { Icon } from '@/presentation/components/icons/icon';
import { BottomSheet, MenuItem } from '@/presentation/components/overlay/bottom-sheet';
import { Dialog } from '@/presentation/components/overlay/dialog';
import { Text } from '@/presentation/components/text';
import type { Id } from '@/domain/models/vocabulary';
import type { WorkoutSet } from '@/domain/models/workout';
import { remainingSets } from '@/domain/rules/workout/remaining-sets';
import { ReasonRow } from '@/presentation/features/workout/reason-row';
import { RestBar } from '@/presentation/features/workout/rest-bar';
import { RestNotice } from '@/presentation/features/workout/rest-notice';
import { RestScreen } from '@/presentation/features/workout/rest-screen';
import type { RirField } from '@/presentation/features/workout/set-form';
import { SetRow } from '@/presentation/features/workout/set-row';
import { SetEffort } from '@/presentation/features/workout/set-effort';
import { SetSheet } from '@/presentation/features/workout/set-sheet';
import { SubstituteSheet } from '@/presentation/features/workout/substitute-sheet';
import { useCountdown } from '@/presentation/features/workout/use-countdown';
import { useElapsed } from '@/presentation/features/workout/use-elapsed';
import { WhySheet } from '@/presentation/features/workout/why-sheet';
import {
  useWorkoutViewModel,
  type WorkoutContent,
  type WorkoutViewModel,
} from '@/presentation/features/workout/use-workout-view-model';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { dialogs } from '@/presentation/strings/dialogs';
import { home } from '@/presentation/strings/home';
import { routines } from '@/presentation/strings/routines';
import { workout as text } from '@/presentation/strings/workout';
import { colors, radius, space, typography } from '@/presentation/theme';

/** A short pulse when a set is logged (RF-ENT-02.AC1). */
const LOGGED_VIBRATION_MS = 30;
/** The end of the rest with the app open (RF-ENT-06.AC6): longer, so it is felt in a pocket. */
const REST_END_VIBRATION = [0, 400, 200, 400];

interface WorkoutScreenProps {
  /** No workout in progress any more: back to the tabs. */
  onClose: () => void;
  /** RF-ENT-11: finished, to its summary (S12). */
  onFinished: (workoutId: Id) => void;
}

/** S09 · Entrenamiento en curso (08 §5): the current exercise, its sets and «Hecho». */
export function WorkoutScreen({ onClose, onFinished }: WorkoutScreenProps) {
  // RF-ENT-07: the screen stays on only here; leaving S09 lets it turn off again.
  useKeepAwake();
  const viewModel = useWorkoutViewModel();
  const { state } = viewModel;
  const insets = useSafeAreaInsets();
  const none = state.status === 'none';

  // Once: the route's callback is a new function on every render.
  const closed = useRef(false);
  useEffect(() => {
    if (!none || closed.current) return;
    closed.current = true;
    onClose();
  }, [none, onClose]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {state.status === 'content' && (
        <Workout
          viewModel={viewModel}
          content={state}
          bottomInset={insets.bottom}
          finish={async (run) => {
            // Finishing leaves no workout in progress: S12 replaces the screen, not «back».
            closed.current = true;
            const id = await run();
            if (id === null) closed.current = false;
            else onFinished(id);
          }}
        />
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
  finish,
}: {
  viewModel: WorkoutViewModel;
  content: WorkoutContent;
  bottomInset: number;
  /** Runs a finish action; once finished, to S12. */
  finish: (run: () => Promise<Id | null>) => Promise<void>;
}) {
  const { sheet, deleted, actions, rest, restMinimized, dialog, notice, confirm } = viewModel;
  const remaining = useCountdown(rest?.endsAt ?? null);
  const restEnded = remaining !== null && remaining <= 0;

  // RF-ENT-06.AC6: once, when it ends with the app open (not when opening an old one).
  const wasRunning = useRef(false);
  useEffect(() => {
    if (remaining === null) {
      wasRunning.current = false;
      return;
    }
    if (!restEnded) wasRunning.current = true;
    else if (wasRunning.current) {
      wasRunning.current = false;
      Vibration.vibrate(REST_END_VIBRATION);
    }
  }, [remaining, restEnded]);
  const { exercise, exercises, exerciseIndex, rows, effortMode } = content;
  const time = useElapsed(content.startedAt);
  const unit = exercise.grid?.unit ?? null;
  const name = exercise.name ?? catalog.detail.unavailable;
  const { prescription } = exercise.exercise;
  const currentNumber = rows.find((r) => r.kind === 'current')?.number ?? rows.length;

  async function done() {
    if ((await actions.done()) === 'logged') Vibration.vibrate(LOGGED_VIBRATION_MS);
  }
  async function confirmSet() {
    if (sheet?.kind === 'edit') return actions.saveEdit();
    if ((await actions.confirmAdjust()) === 'logged') Vibration.vibrate(LOGGED_VIBRATION_MS);
  }

  return (
    <>
      <View style={styles.header}>
        <Text style={[typography.bodyLStrong, { color: colors.textPrimary }]}>
          {content.dayName}
        </Text>
        <Text style={[typography.monoS, styles.flex, { color: colors.textSecondary }]}>{time}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={text.workoutMenu.title}
          onPress={actions.openWorkoutMenu}
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
            accessibilityLabel={text.exerciseMenu.title(name)}
            onPress={actions.openExerciseMenu}
            style={styles.iconButton}
          >
            <Icon name="dots" color={colors.textPrimary} />
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
          <Text style={[typography.bodyS, styles.flex, { color: colors.textSecondary }]}>
            {text.header.exerciseOf(exerciseIndex + 1, exercises.length)}
          </Text>
          <Button variant="tertiary" label={text.header.seeAll} onPress={actions.openExercises} />
        </View>
        {exercise.notes && (
          <Text style={[typography.bodyM, { color: colors.textSecondary }]}>{exercise.notes}</Text>
        )}
        <ReasonRow line={content.reason.line} icon={content.reason.icon} onWhy={actions.openWhy} />
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
        {notice && <RestNotice notice={notice} onPress={() => void actions.openNotice()} />}
        {rest && restMinimized && remaining !== null && (
          <RestBar
            rest={rest}
            remainingMs={remaining}
            onAdd={() => void actions.addRest()}
            onExpand={actions.expandRest}
          />
        )}
        {content.awaitingEffort && (
          <CalibrationEffort
            waiting={content.awaitingEffort}
            effortMode={effortMode}
            onEffort={(set, field, rir) => void actions.chooseEffort(set, field, rir)}
          />
        )}
        {deleted && (
          <Snackbar
            message={text.setDeleted.message}
            action={{ label: text.setDeleted.undo, onPress: () => void actions.undo() }}
            onDismiss={actions.dismissUndo}
          />
        )}
        {(content.primary === 'done' || content.primary === 'awaitEffort') && (
          <Button
            variant="primary"
            size="xl"
            label={text.primaryAction.done}
            icon="check"
            disabled={content.primary === 'awaitEffort'}
            onPress={() => void done()}
          />
        )}
        {content.primary === 'finish' && (
          <Button
            variant="primary"
            size="xl"
            label={text.primaryAction.finish}
            onPress={() => void finish(actions.finish)}
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
        onConfirm={() => void confirmSet()}
        onDelete={() => void actions.deleteSet()}
        onClose={actions.closeSheet}
      />
      <WhySheet detail={sheet?.kind === 'why' ? sheet.detail : null} onClose={actions.closeSheet} />
      {rest && remaining !== null && (
        <RestScreen
          rest={rest}
          visible={!restMinimized}
          remainingMs={remaining}
          effortMode={effortMode}
          onAdd={() => void actions.addRest()}
          onRestart={() => void actions.restartRest()}
          onSkip={() => void actions.skipRest()}
          onMinimize={actions.minimizeRest}
          onEffort={(set, field, rir) => void actions.chooseEffort(set, field, rir)}
        />
      )}
      <Dialog
        visible={dialog === 'notifications'}
        title={dialogs.D05.title}
        body={dialogs.D05.body}
        actions={[
          {
            label: dialogs.D05.allow,
            kind: 'advance',
            onPress: () => void actions.allowNotifications(),
          },
          { label: dialogs.D05.notNow, kind: 'plain', onPress: () => void actions.dismissDialog() },
        ]}
        onDismiss={() => void actions.dismissDialog()}
      />
      <Dialog
        visible={dialog === 'exactAlarms'}
        title={dialogs.D17.title}
        body={dialogs.D17.body}
        actions={[
          {
            label: dialogs.D17.openSettings,
            kind: 'advance',
            onPress: () => void actions.openExactAlarmSettings(),
          },
          { label: dialogs.D17.notNow, kind: 'plain', onPress: () => void actions.dismissDialog() },
        ]}
        onDismiss={() => void actions.dismissDialog()}
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
                {e.exercise.status === 'skipped'
                  ? text.exerciseList.skipped
                  : text.exerciseList.progress(
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
        <MenuItem
          icon="swap"
          label={text.exerciseMenu.substitute}
          onPress={actions.openSubstitute}
        />
        <MenuItem
          icon="skip"
          label={text.exerciseMenu.skip}
          onPress={() => void actions.skipExercise()}
        />
        <MenuItem icon="plus" label={text.exerciseMenu.addSet} onPress={actions.addSet} />
      </BottomSheet>
      <BottomSheet
        visible={sheet?.kind === 'workoutMenu'}
        title={text.workoutMenu.title}
        subtitle={text.workoutMenu.subtitle(content.dayName, time ?? '')}
        closeLabel={common.close}
        onClose={actions.closeSheet}
      >
        <MenuItem
          icon="flag"
          label={text.workoutMenu.finish}
          onPress={() => void finish(actions.finish)}
        />
        <MenuItem
          icon="trash"
          label={text.workoutMenu.discard}
          destructive
          onPress={actions.discard}
        />
      </BottomSheet>
      <SubstituteSheet
        sheet={sheet?.kind === 'substitute' ? sheet : null}
        originalName={name}
        onSearch={actions.searchSubstitute}
        onChoose={(exercise) => void actions.substitute(exercise)}
        onClose={actions.closeSheet}
      />
      <Dialog
        visible={confirm?.kind === 'finish'}
        title={dialogs.D10.title(confirm?.kind === 'finish' ? confirm.pending : 0)}
        body={dialogs.D10.body}
        actions={[
          {
            label: dialogs.D10.finish,
            kind: 'advance',
            onPress: () => void finish(actions.confirmFinish),
          },
          { label: dialogs.D10.keepTraining, kind: 'plain', onPress: actions.closeConfirm },
        ]}
        onDismiss={actions.closeConfirm}
      />
      <Dialog
        visible={confirm?.kind === 'discard'}
        title={dialogs.D09.title}
        body={dialogs.D09.body(confirm?.kind === 'discard' ? confirm.sets : 0)}
        actions={[
          { label: dialogs.D09.cancel, kind: 'safe', onPress: actions.closeConfirm },
          {
            label: dialogs.D09.discardDestructive,
            kind: 'destructive',
            onPress: () => void actions.confirmDiscard(),
          },
        ]}
        onDismiss={actions.closeConfirm}
      />
    </>
  );
}

/**
 * RF-SUG-02.AC4 (Figma «S09 · Calibración»): the effort of a calibration set, required before the
 * next one; one row per side when the sides differ.
 */
function CalibrationEffort({
  waiting,
  effortMode,
  onEffort,
}: {
  waiting: NonNullable<WorkoutContent['awaitingEffort']>;
  effortMode: WorkoutContent['effortMode'];
  onEffort: (set: WorkoutSet, field: RirField, rir: number) => void;
}) {
  return (
    <View style={styles.effort}>
      <SetEffort set={waiting.set} effortMode={effortMode} onEffort={onEffort} />
      <Text style={[typography.bodyM, { color: colors.textSecondary }]}>
        {text.calibration.askEffortForSet(waiting.number)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  effort: { gap: space.s10, paddingBottom: space.s8 },
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
