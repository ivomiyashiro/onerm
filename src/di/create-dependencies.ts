import { InMemoryExerciseRepository } from '@/data/repositories/in-memory-exercise-repository';
import { ObserveExercises } from '@/domain/usecases/observe-exercises';
import { createAppStore, type AppStore } from '@/presentation/state/app-store';
import type { UseCases } from '@/presentation/use-cases/use-cases-context';

export interface Dependencies {
  useCases: UseCases;
  appStore: AppStore;
}

// Example data until the bundled catalog (#28) and the SQLite repository (#29).
const EXAMPLE_EXERCISES = [
  { id: 'barbell-back-squat', name: 'Sentadilla con barra' },
  { id: 'barbell-bench-press', name: 'Press de banca con barra' },
];

/**
 * Composition root (ADR-0011 §4): the only place that creates implementations from `data` and
 * hands them to the use cases. Swapping a repository only touches this file.
 */
export function createDependencies(): Dependencies {
  const exerciseRepository = new InMemoryExerciseRepository(EXAMPLE_EXERCISES);

  return {
    useCases: { observeExercises: new ObserveExercises(exerciseRepository) },
    appStore: createAppStore(),
  };
}
