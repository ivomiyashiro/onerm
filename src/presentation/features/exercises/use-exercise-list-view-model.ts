import { useEffect, useState } from 'react';

import type { Exercise } from '@/domain/models/exercise';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export type ExerciseListState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'content'; exercises: Exercise[] }
  | { status: 'error' };

export interface ExerciseListViewModel {
  state: ExerciseListState;
  actions: { retry(): void };
}

/**
 * Example ViewModel (#18, ADR-0011 §1): observes the catalog through a use case and exposes the
 * screen state as a discriminated union. The screen picks the texts for each state.
 */
export function useExerciseListViewModel(): ExerciseListViewModel {
  const { observeExercises } = useUseCases();
  const [state, setState] = useState<ExerciseListState>({ status: 'loading' });
  // Changing it re-runs the effect, which subscribes again.
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      observeExercises.execute({
        next: (exercises) =>
          setState(exercises.length === 0 ? { status: 'empty' } : { status: 'content', exercises }),
        error: () => setState({ status: 'error' }),
      }),
    [observeExercises, attempt],
  );

  function retry() {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }

  return { state, actions: { retry } };
}
