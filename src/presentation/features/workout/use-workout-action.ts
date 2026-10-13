import { useEffect, useState } from 'react';

import type { Id } from '@/domain/models/vocabulary';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

/** The central tab button (08 §2, marca §15). */
export type WorkoutAction =
  | { kind: 'start' }
  | { kind: 'continue'; startedAt: Date }
  /** Loading, a read error or no active routine (RF-ENT-01.AC7). */
  | { kind: 'disabled' };

export interface WorkoutActionViewModel {
  action: WorkoutAction;
  run(): Promise<void>;
}

/**
 * RF-ENT-01: «Empezar» starts the next day of the active routine; «Continuar» goes back to the
 * workout in progress (RN-ENT-01). Both only read and write the local database (AC6).
 */
export function useWorkoutAction(onOpenWorkout: () => void): WorkoutActionViewModel {
  const { observeNextDay, observeWorkoutInProgress, startWorkout } = useUseCases();
  const [nextDayId, setNextDayId] = useState<Id | null>(null);
  const [startedAt, setStartedAt] = useState<Date | null>(null);

  useEffect(
    () =>
      observeNextDay.execute({
        next: (overview) => setNextDayId(overview.kind === 'nextDay' ? overview.day.id : null),
        error: () => setNextDayId(null),
      }),
    [observeNextDay],
  );
  useEffect(
    () =>
      observeWorkoutInProgress.execute({
        next: (workout) => setStartedAt(workout?.startedAt ?? null),
        error: () => setStartedAt(null),
      }),
    [observeWorkoutInProgress],
  );

  const action: WorkoutAction =
    startedAt !== null
      ? { kind: 'continue', startedAt }
      : nextDayId !== null
        ? { kind: 'start' }
        : { kind: 'disabled' };

  async function run() {
    if (action.kind === 'disabled') return;
    if (action.kind === 'start' && nextDayId !== null) {
      const result = await startWorkout.execute(nextDayId);
      if (result.status === 'missing') return;
    }
    onOpenWorkout();
  }

  return { action, run };
}
