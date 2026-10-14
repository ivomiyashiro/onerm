import { useEffect, useState } from 'react';

import type { Id } from '@/domain/models/vocabulary';
import type { WorkoutSummary } from '@/domain/usecases/observe-workout-summary';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export type WorkoutSummaryState =
  | { status: 'loading' }
  | { status: 'content'; summary: WorkoutSummary }
  /** Deleted since (or a bad link): back to the tabs. */
  | { status: 'missing' }
  | { status: 'error' };

/** S12 · Resumen del entrenamiento (RF-ENT-11.AC1): it follows the local data. */
export function useWorkoutSummaryViewModel(workoutId: Id): WorkoutSummaryState {
  const { observeWorkoutSummary } = useUseCases();
  const [state, setState] = useState<WorkoutSummaryState>({ status: 'loading' });

  useEffect(
    () =>
      observeWorkoutSummary.execute(workoutId, {
        next: (summary) =>
          setState(summary === null ? { status: 'missing' } : { status: 'content', summary }),
        error: () => setState({ status: 'error' }),
      }),
    [observeWorkoutSummary, workoutId],
  );

  return state;
}
