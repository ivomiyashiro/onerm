import type { TabAction } from '@/presentation/components/navigation/tab-bar';
import {
  useWorkoutAction,
  type WorkoutAction,
} from '@/presentation/features/workout/use-workout-action';
import { navigation } from '@/presentation/strings/navigation';

/**
 * The central tab button with its texts (RF-ENT-01.AC4, AC7). The running time is the disc's own
 * clock (#229): here it would render the whole tab navigator every second.
 */
export function useTabAction(onOpenWorkout: () => void): TabAction {
  const { action, run } = useWorkoutAction(onOpenWorkout);
  const onPress = () => void run();
  const accessibilityLabel = (time: string | null) => tabActionName(action, time);
  if (action.kind === 'continue') {
    return {
      kind: 'continue',
      label: navigation.action.continue,
      accessibilityLabel,
      startedAt: action.startedAt,
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
