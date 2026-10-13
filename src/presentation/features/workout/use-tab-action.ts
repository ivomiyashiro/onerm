import type { TabAction } from '@/presentation/components/navigation/tab-bar';
import { useElapsed } from '@/presentation/features/workout/use-elapsed';
import { useWorkoutAction } from '@/presentation/features/workout/use-workout-action';
import { navigation } from '@/presentation/strings/navigation';

/** The central tab button with its texts and the running time (RF-ENT-01.AC4, AC7). */
export function useTabAction(onOpenWorkout: () => void): TabAction {
  const { action, run } = useWorkoutAction(onOpenWorkout);
  const time = useElapsed(action.kind === 'continue' ? action.startedAt : null);
  const onPress = () => void run();
  if (action.kind === 'continue') {
    return {
      kind: 'continue',
      label: navigation.action.continue,
      time: time ?? undefined,
      onPress,
    };
  }
  return { kind: action.kind, label: navigation.action.start, onPress };
}
