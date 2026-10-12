import { Dialog } from '@/presentation/components/overlay/dialog';
import { dialogs } from '@/presentation/strings/dialogs';

/** The confirmation S13 and S14 show: D07, D11 or D14 (RN-RUT-09). */
export type RoutinesDialog =
  | { kind: 'replaceActive'; routineName: string; activeName: string }
  | { kind: 'delete'; routineName: string }
  | { kind: 'workoutInProgress'; action: 'changeRoutine' | 'deleteRoutine' };

interface RoutineChangeDialogProps {
  dialog: RoutinesDialog | null;
  onConfirm: () => void;
  onDismiss: () => void;
  onGoToWorkout: () => void;
}

/** D07, D11 and D14 (13 §8) for a change of the active routine, from S13 and S14. */
export function RoutineChangeDialog({
  dialog,
  onConfirm,
  onDismiss,
  onGoToWorkout,
}: RoutineChangeDialogProps) {
  if (dialog === null) return null;
  switch (dialog.kind) {
    case 'replaceActive':
      return (
        <Dialog
          visible
          title={dialogs.D07.title(dialog.routineName)}
          body={dialogs.D07.body(dialog.activeName)}
          actions={[
            { label: dialogs.D07.use, kind: 'advance', onPress: onConfirm },
            { label: dialogs.D07.cancel, kind: 'plain', onPress: onDismiss },
          ]}
          onDismiss={onDismiss}
        />
      );
    case 'delete':
      return (
        <Dialog
          visible
          title={dialogs.D11.title(dialog.routineName)}
          body={dialogs.D11.body}
          actions={[
            { label: dialogs.D11.cancel, kind: 'safe', onPress: onDismiss },
            { label: dialogs.D11.deleteDestructive, kind: 'destructive', onPress: onConfirm },
          ]}
          onDismiss={onDismiss}
        />
      );
    case 'workoutInProgress':
      return (
        <Dialog
          visible
          title={dialogs.D14.title}
          body={dialogs.D14.body(dialog.action)}
          actions={[
            {
              label: dialogs.D14.goToWorkout,
              kind: 'advance',
              onPress: () => {
                onDismiss();
                onGoToWorkout();
              },
            },
            { label: dialogs.D14.cancel, kind: 'plain', onPress: onDismiss },
          ]}
          onDismiss={onDismiss}
        />
      );
  }
}
