import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Vibration, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/presentation/components/badge/badge';
import { Button } from '@/presentation/components/button/button';
import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { Snackbar } from '@/presentation/components/feedback/snackbar';
import { Icon } from '@/presentation/components/icons/icon';
import { SwipeRow, type SwipeA11y } from '@/presentation/components/list/swipe-row';
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
import { ElapsedText } from '@/presentation/components/clock/elapsed-text';
import { useOnScreenSince } from '@/presentation/components/clock/use-on-screen-since';
import { useCountdown } from '@/presentation/components/clock/use-countdown';
import { useElapsed } from '@/presentation/components/clock/use-elapsed';
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
/** How far the exercise has to be swiped to change it (08 §5). */
const SWIPE_DISTANCE = 64;
/** The swipe starts after this much sideways, and gives way to the scroll after this much down. */
const SWIPE_START = 24;
const SCROLL_START = 12;

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
            // #241: the dialog stays open while it finishes; a second tap finishes nothing.
            if (closed.current) return;
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
  // #229: the clocks live in leaf components (the time, the rest, its vibration, the menu), so
  // their ticks don't render the whole screen.
  const { exercise, exercises, exerciseIndex, rows, effortMode } = content;
  const unit = exercise.grid?.unit ?? null;
  const name = exercise.name ?? catalog.detail.unavailable;
  const { prescription } = exercise.exercise;
  const currentNumber = rows.find((r) => r.kind === 'current')?.number ?? rows.length;

  // 08 §5: swiping changes the exercise, without wrapping; screen readers use «Ver todos». Horizontal
  // only, so the list still scrolls. On the JS thread: it only ends in a state change.
  const swipe = Gesture.Pan()
    .runOnJS(true)
    .withTestId('swipe exercise')
    .activeOffsetX([-SWIPE_START, SWIPE_START])
    .failOffsetY([-SCROLL_START, SCROLL_START])
    .onEnd(({ translationX }) => {
      if (Math.abs(translationX) < SWIPE_DISTANCE) return;
      const to = exerciseIndex + (translationX < 0 ? 1 : -1);
      if (to >= 0 && to < exercises.length) actions.goTo(to);
    });

  async function done() {
    if ((await actions.done()) === 'logged') Vibration.vibrate(LOGGED_VIBRATION_MS);
  }
  async function confirmSet() {
    if (sheet?.kind === 'edit') return actions.saveEdit();
    if ((await actions.confirmAdjust()) === 'logged') Vibration.vibrate(LOGGED_VIBRATION_MS);
  }

  const permissionDialogs = (
    <>
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
    </>
  );

  return (
    <>
      <View style={styles.header}>
        <Text style={[typography.bodyLStrong, { color: colors.textPrimary }]}>
          {content.dayName}
        </Text>
        <ElapsedText
          // Under the full-screen rest nobody sees it: it doesn't tick (#229).
          startedAt={rest && !restMinimized ? null : content.startedAt}
          style={[typography.monoS, styles.flex, { color: colors.textSecondary }]}
        />
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
      <GestureDetector gesture={swipe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.title}>
            <Text
              style={[typography.titleL, styles.flex, { color: colors.textPrimary }]}
              accessibilityRole="header"
            >
              {name}
            </Text>
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
              if (row.kind !== 'done') return <View key={`pending-${row.number}`}>{setRow()}</View>;
              // #198: a done set is edited or deleted (with «Deshacer») swiping it.
              return (
                <SwipeRow
                  key={row.set.id}
                  testID={`set ${row.number}`}
                  actions={[
                    {
                      key: 'edit',
                      label: common.swipe.edit,
                      icon: 'edit',
                      onPress: () => actions.openSet(row.set.id),
                    },
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
      </GestureDetector>
      <View style={[styles.bottom, { paddingBottom: bottomInset + space.s8 }]}>
        {notice && <RestNotice notice={notice} onPress={() => void actions.openNotice()} />}
        {rest && restMinimized && (
          <RestBar rest={rest} onAdd={() => void actions.addRest()} onExpand={actions.expandRest} />
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
        onDelete={() => sheet?.kind === 'edit' && void actions.deleteSet(sheet.set.id)}
        onClose={actions.closeSheet}
      />
      <WhySheet detail={sheet?.kind === 'why' ? sheet.detail : null} onClose={actions.closeSheet} />
      <RestEndVibration endsAt={rest?.endsAt ?? null} />
      {rest && (
        <RestScreen
          rest={rest}
          visible={!restMinimized}
          effortMode={effortMode}
          onAdd={() => void actions.addRest()}
          onRestart={() => void actions.restartRest()}
          onSkip={() => void actions.skipRest()}
          onMinimize={actions.minimizeRest}
          onEffort={(set, field, rir) => void actions.chooseEffort(set, field, rir)}
        />
      )}
      {/* After the rest in the tree: D05 and D17 open over it (RF-ENT-06.AC9). */}
      {permissionDialogs}
      <BottomSheet
        visible={sheet?.kind === 'exercises'}
        title={text.exerciseList.title}
        subtitle={text.exerciseList.subtitle(content.dayName, exerciseIndex + 1, exercises.length)}
        closeLabel={common.close}
        onClose={actions.closeSheet}
      >
        {exercises.map((e, index) => {
          const logged = e.exercise.sets.filter((s) => !s.isWarmup).length;
          // Figma «S09 · Ver todos con salteado»: a skipped exercise is muted.
          const muted = e.exercise.status === 'skipped' ? colors.textSecondary : colors.textPrimary;
          return (
            <Pressable
              key={e.exercise.id}
              accessibilityRole="button"
              accessibilityLabel={e.name ?? catalog.detail.unavailable}
              accessibilityState={{ selected: index === exerciseIndex }}
              onPress={() => actions.goTo(index)}
              style={[styles.listRow, index === exerciseIndex && styles.listRowCurrent]}
            >
              <Text style={[typography.bodyRow, styles.flex, { color: muted }]}>
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
      <WorkoutMenu
        visible={sheet?.kind === 'workoutMenu'}
        dayName={content.dayName}
        startedAt={content.startedAt}
        onFinish={() => void finish(actions.finish)}
        onDiscard={actions.discard}
        onClose={actions.closeSheet}
      />
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
        visible={confirm?.kind === 'empty'}
        title={dialogs.D18.title}
        body={dialogs.D18.body}
        actions={[
          { label: dialogs.D18.keepTraining, kind: 'safe', onPress: actions.closeConfirm },
          {
            label: dialogs.D18.discardDestructive,
            kind: 'destructive',
            onPress: () => void actions.confirmDiscard(),
          },
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
 * RF-ENT-06.AC6: a vibration once, when the rest ends with the app open (not when opening an old
 * one, nor when coming back to one that ended in the background: the notification already said
 * so). A leaf with its own countdown, so its ticks render nothing else (#229).
 */
function RestEndVibration({ endsAt }: { endsAt: Date | null }) {
  const remaining = useCountdown(endsAt);
  const restEnded = remaining !== null && remaining <= 0;
  const onScreen = useOnScreenSince() !== null;
  const wasRunning = useRef(false);
  useEffect(() => {
    if (remaining === null || !onScreen) {
      wasRunning.current = false;
      return;
    }
    if (!restEnded) wasRunning.current = true;
    else if (wasRunning.current) {
      wasRunning.current = false;
      Vibration.vibrate(REST_END_VIBRATION);
    }
  }, [remaining, restEnded, onScreen]);
  return null;
}

/** The workout's «…» (08 §5): its subtitle has the running time, which only ticks while open. */
function WorkoutMenu({
  visible,
  dayName,
  startedAt,
  onFinish,
  onDiscard,
  onClose,
}: {
  visible: boolean;
  dayName: string;
  startedAt: Date;
  onFinish: () => void;
  onDiscard: () => void;
  onClose: () => void;
}) {
  const time = useElapsed(visible ? startedAt : null);
  return (
    <BottomSheet
      visible={visible}
      title={text.workoutMenu.title}
      subtitle={text.workoutMenu.subtitle(dayName, time ?? '')}
      closeLabel={common.close}
      onClose={onClose}
    >
      <MenuItem icon="flag" label={text.workoutMenu.finish} onPress={onFinish} />
      <MenuItem icon="trash" label={text.workoutMenu.discard} destructive onPress={onDiscard} />
    </BottomSheet>
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
  addSet: { alignSelf: 'center' },
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
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: space.s8,
    paddingLeft: space.s4,
  },
  seeAll: { marginLeft: 'auto' },
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
