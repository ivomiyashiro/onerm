import { Pressable, StyleSheet, Vibration } from 'react-native';

import type { Id } from '@/domain/models/vocabulary';
import { BottomSheet } from '@/presentation/components/overlay/bottom-sheet';
import { Dialog } from '@/presentation/components/overlay/dialog';
import { Text } from '@/presentation/components/text';
import { HowToSheet } from '@/presentation/features/exercises/how-to-sheet';
import { RestEnd } from '@/presentation/features/workout/rest-end';
import { RestScreen } from '@/presentation/features/workout/rest-screen';
import { SubstituteSheet } from '@/presentation/features/workout/substitute-sheet';
import type {
  WorkoutContent,
  WorkoutViewModel,
} from '@/presentation/features/workout/use-workout-view-model';
import { WhySheet } from '@/presentation/features/workout/why-sheet';
import { WorkoutMenu } from '@/presentation/features/workout/workout-menu';
import { LOGGED_VIBRATION_MS } from '@/presentation/features/workout/workout-vibration';
import { SetSheet } from '@/presentation/shared/set/set-sheet';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { dialogs } from '@/presentation/strings/dialogs';
import { workout as text } from '@/presentation/strings/workout';
import { colors, radius, space, typography } from '@/presentation/theme';

/**
 * The sheets and dialogs of S09, in their stacking order: a later one opens over an earlier one,
 * so the rest stays before D05 and D17 (RF-ENT-06.AC9). A fragment, so the Modals keep the same
 * parent as before (iOS stacks them by order).
 */
export function WorkoutOverlays({
  viewModel,
  content,
  onOpenVideo,
  finish,
}: {
  viewModel: WorkoutViewModel;
  content: WorkoutContent;
  onOpenVideo: (url: string) => void;
  /** Runs a finish action; once finished, to S12. */
  finish: (run: () => Promise<Id | null>) => Promise<void>;
}) {
  const { sheet, actions, rest, restMinimized, dialog, confirm } = viewModel;
  const { exercise, exercises, exerciseIndex, rows, effortMode } = content;
  const name = exercise.name ?? catalog.detail.unavailable;
  const { prescription } = exercise.exercise;
  const currentNumber = rows.find((r) => r.kind === 'current')?.number ?? rows.length;

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
      <HowToSheet
        exercise={sheet?.kind === 'howTo' ? exercise.catalog : null}
        onOpenVideo={onOpenVideo}
        onClose={actions.closeSheet}
      />
      <RestEnd endsAt={rest?.endsAt ?? null} onEnd={actions.endRest} />
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
