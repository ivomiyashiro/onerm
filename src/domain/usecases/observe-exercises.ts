import type { Exercise } from '@/domain/models/exercise';
import type { ExerciseRepository } from '@/domain/repositories/exercise-repository';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';

/** Observes the catalog. Example use case of the composition root (#18). */
export class ObserveExercises {
  constructor(private readonly exercises: ExerciseRepository) {}

  execute(observer: Observer<Exercise[]>): Unsubscribe {
    return this.exercises.observeAll(observer);
  }
}
