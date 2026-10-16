import type { TabAction } from '@/presentation/components/navigation/tab-bar';
import { useElapsed } from '@/presentation/features/workout/use-elapsed';
import {
  useWorkoutAction,
  type WorkoutAction,
} from '@/presentation/features/workout/use-workout-action';
import { navigation } from '@/presentation/strings/navigation';

/** The central tab button with its texts and the running time (RF-ENT-01.AC4, AC7). */
export function useTabAction(onOpenWorkout: () => void): TabAction {
  const { action, run } = useWorkoutAction(onOpenWorkout);
  const time = useElapsed(action.kind === 'continue' ? action.startedAt : null);
  const onPress = () => void run();
  const accessibilityLabel = tabActionName(action, time);
  if (action.kind === 'continue') {
    return {
      kind: 'continue',
      label: navigation.action.continue,
      accessibilityLabel,
      time: time ?? undefined,
      onPress,
    };
  }
  return { kind: action.kind, label: navigation.action.start, accessibilityLabel, onPress };
}

/** The accessible name of the button (13 §10, RNF-18). */
export function tabActionName(action: WorkoutAction, time: string | null): string {
  switch (action.kind) {
    case 'start':
      return navigation.action.startName(action.dayName);
    case 'continue':
      return time ? navigation.action.continueName(time) : navigation.action.continue;
    case 'disabled':
      return navigation.action.disabledName;
  }
}
