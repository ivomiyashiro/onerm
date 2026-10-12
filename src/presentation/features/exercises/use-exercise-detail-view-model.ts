import { useEffect, useState } from 'react';

import type { Exercise } from '@/domain/models/exercise';
import type { Id } from '@/domain/models/vocabulary';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export type ExerciseDetailState =
  | { status: 'loading' }
  | { status: 'content'; exercise: Exercise; hasProgress: boolean }
  /** Not in the local catalog: an unknown link, or not downloaded yet (RN-CAT-04). */
  | { status: 'notFound' }
  | { status: 'error' };

export interface ExerciseDetailViewModel {
  state: ExerciseDetailState;
  actions: { retry(): void };
}

/** S17 · Detalle de ejercicio (RF-CAT-02): the local exercise and whether it has progress. */
export function useExerciseDetailViewModel(exerciseId: Id): ExerciseDetailViewModel {
  const { observeExerciseDetail } = useUseCases();
  const [state, setState] = useState<ExerciseDetailState>({ status: 'loading' });
  // Changing it re-runs the effect, which subscribes again.
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      observeExerciseDetail.execute(exerciseId, {
        next: (detail) =>
          setState(detail === null ? { status: 'notFound' } : { status: 'content', ...detail }),
        error: () => setState({ status: 'error' }),
      }),
    [observeExerciseDetail, exerciseId, attempt],
  );

  function retry() {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }

  return { state, actions: { retry } };
}
