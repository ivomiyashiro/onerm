import { StyleSheet, Vibration, View } from 'react-native';

import type { Id } from '@/domain/models/vocabulary';
import { Button } from '@/presentation/components/button/button';
import { Snackbar } from '@/presentation/components/feedback/snackbar';
import { Reveal } from '@/presentation/components/motion/reveal';
import { CalibrationEffort } from '@/presentation/features/workout/calibration-effort';
import { RestBar } from '@/presentation/features/workout/rest-bar';
import { RestNotice } from '@/presentation/features/workout/rest-notice';
import type {
  WorkoutContent,
  WorkoutViewModel,
} from '@/presentation/features/workout/use-workout-view-model';
import { LOGGED_VIBRATION_MS } from '@/presentation/features/workout/workout-vibration';
import { workout as text } from '@/presentation/strings/workout';
import { colors, space } from '@/presentation/theme';

/** Under the sets: the rest's notice and bar, the calibration effort, «Deshacer» and the main button. */
export function ActionBar({
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
  const { deleted, actions, rest, restMinimized, notice } = viewModel;
  const { effortMode } = content;

  async function done() {
    if ((await actions.done()) === 'logged') Vibration.vibrate(LOGGED_VIBRATION_MS);
  }

  return (
    <View style={[styles.bottom, { paddingBottom: bottomInset + space.s8 }]}>
      {notice && <RestNotice notice={notice} onPress={() => void actions.openNotice()} />}
      {rest && restMinimized && (
        // #248 M1: the minimized rest rises over «Hecho».
        <Reveal>
          <RestBar rest={rest} onAdd={() => void actions.addRest()} onExpand={actions.expandRest} />
        </Reveal>
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
  );
}

const styles = StyleSheet.create({
  bottom: {
    gap: space.s8,
    paddingTop: space.s16,
    paddingHorizontal: space.s16,
    backgroundColor: colors.bgBase,
  },
});
