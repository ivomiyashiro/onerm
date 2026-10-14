import type { Id } from '@/domain/models/vocabulary';
import { Dialog } from '@/presentation/components/overlay/dialog';
import { useWorkoutResume } from '@/presentation/features/workout/use-workout-resume';
import { dialogs } from '@/presentation/strings/dialogs';
import { longDate } from '@/presentation/strings/numbers';

/** RF-ENT-13 on opening the app: back to S09, or D02 for an abandoned workout (Figma «Inicio · D02»). */
export function WorkoutResumeDialog(props: {
  onResume: () => void;
  onFinished: (workoutId: Id) => void;
}) {
  const { abandoned, actions } = useWorkoutResume(props);
  return (
    <Dialog
      visible={abandoned !== null}
      title={dialogs.D02.title}
      body={abandoned ? dialogs.D02.body(longDate(abandoned.startedAt), abandoned.sets) : undefined}
      actions={[
        { label: dialogs.D02.finish, kind: 'advance', onPress: () => void actions.finish() },
        { label: dialogs.D02.continue, kind: 'plain', onPress: actions.continue },
        { label: dialogs.D02.discard, kind: 'destructive', onPress: () => void actions.discard() },
      ]}
      // Back keeps the workout as it is, like «Continuar» without opening it.
      onDismiss={actions.dismiss}
    />
  );
}
