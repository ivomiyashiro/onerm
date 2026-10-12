import type { Exercise } from '@/domain/models/exercise';
import type { Id } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import type { ExerciseRepository } from '@/domain/repositories/exercise-repository';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import { exerciseExposures } from '@/domain/rules/suggestion/exposures';
import { observeTogether } from '@/domain/usecases/observe-together';

/** What S17 shows: the catalog exercise and whether it has progress to open (RF-CAT-02). */
export interface ExerciseDetail {
  readonly exercise: Exercise;
  /** RF-CAT-02 AC2: the same exposures S20 draws, so the link never opens an empty progress. */
  readonly hasProgress: boolean;
}

/**
 * Observes one exercise of the catalog and the finished workouts together, and again after a
 * change in either; null when the exercise is not in the local catalog (RN-CAT-04).
 */
export class ObserveExerciseDetail {
  constructor(
    private readonly exercises: Pick<ExerciseRepository, 'observeById'>,
    private readonly workouts: Pick<WorkoutRepository, 'observeFinished'>,
  ) {}

  execute(id: Id, observer: Observer<ExerciseDetail | null>): Unsubscribe {
    return observeTogether<[Exercise | null, Workout[]]>(
      [(o) => this.exercises.observeById(id, o), (o) => this.workouts.observeFinished(o)],
      {
        next: ([exercise, finished]) =>
          observer.next(
            exercise && {
              exercise,
              hasProgress: exerciseExposures(exercise.id, finished).length > 0,
            },
          ),
        error: (error) => observer.error(error),
      },
    );
  }
}
