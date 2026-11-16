import { useElapsed } from '@/presentation/components/clock/use-elapsed';
import { BottomSheet, MenuItem } from '@/presentation/components/overlay/bottom-sheet';
import { common } from '@/presentation/strings/common';
import { workout as text } from '@/presentation/strings/workout';

/** The workout's «…» (08 §5): its subtitle has the running time, which only ticks while open. */
export function WorkoutMenu({
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
