import { ObserveExerciseDetail } from '@/domain/usecases/observe-exercise-detail';
import { ObserveExercises } from '@/domain/usecases/observe-exercises';
import { PrepareLocalData } from '@/domain/usecases/prepare-local-data';
import type { UseCases } from '@/presentation/use-cases/use-cases-context';

const never = () => () => {};

/**
 * Test builder: every use case over repositories that never emit, with only what a test cares
 * about overridden. Used by tests only.
 */
export function someUseCases(overrides: Partial<UseCases> = {}): UseCases {
  return {
    observeExercises: new ObserveExercises({ observeAll: never }),
    observeExerciseDetail: new ObserveExerciseDetail(
      { observeById: never },
      { observeFinished: never },
    ),
    prepareLocalData: new PrepareLocalData({ prepare: async () => {} }),
    ...overrides,
  };
}
