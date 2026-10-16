import { Dialog } from '@/presentation/components/overlay/dialog';
import { useGuestUnionViewModel } from '@/presentation/features/auth/use-guest-union-view-model';
import { auth } from '@/presentation/strings/auth';
import { dialogs } from '@/presentation/strings/dialogs';

/**
 * RF-AUTH-05: D01 «¿Sumamos tus datos a la cuenta?» and D01b, over whatever is on screen when a
 * guest device enters an account with data (07 §4.3). Renders nothing otherwise.
 */
export function GuestUnionGate() {
  const { dialog, actions } = useGuestUnionViewModel();
  const summary = dialog?.summary;

  return (
    <>
      <Dialog
        visible={dialog?.kind === 'ask'}
        title={dialogs.D01.title}
        body={
          summary &&
          [
            dialogs.D01.body(summary.workouts, summary.routines),
            dialog?.offline && auth.errors.offline(auth.errors.actions.uniteData),
          ]
            .filter(Boolean)
            .join(' ')
        }
        actions={[
          { label: dialogs.D01.merge, kind: 'advance', onPress: () => void actions.merge() },
          { label: dialogs.D01.discard, kind: 'plain', onPress: actions.discard },
          { label: dialogs.D01.cancel, kind: 'plain', onPress: () => void actions.cancel() },
        ]}
        onDismiss={() => void actions.cancel()}
      />
      <Dialog
        visible={dialog?.kind === 'confirmDiscard'}
        title={dialogs.D01b.title}
        body={
          summary &&
          dialogs.D01b.body(summary.workouts, summary.routines, summary.workoutInProgress)
        }
        actions={[
          { label: dialogs.D01b.cancel, kind: 'safe', onPress: actions.back },
          {
            label: dialogs.D01b.discardDestructive,
            kind: 'destructive',
            onPress: () => void actions.confirmDiscard(),
          },
        ]}
        onDismiss={actions.back}
      />
    </>
  );
}
