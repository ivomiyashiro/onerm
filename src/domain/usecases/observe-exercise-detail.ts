import type { Exercise } from '@/domain/models/exercise';
import type { Id } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import type { ExerciseRepository } from '@/domain/repositories/exercise-repository';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import { exerciseExposures } from '@/domain/rules/suggestion/exposures';

/** What S17 shows: the catalog exercise and whether it has progress to open (RF-CAT-02). */
export interface ExerciseDetail {
  readonly exercise: Exercise;
  /** RF-CAT-02 AC2: the same exposures S20 draws, so the link never opens an empty progress. */
  readonly hasProgress: boolean;
}

/**
 * Observes one exercise of the catalog and the finished workouts together. Emits once both have
 * a value, and again after a change in either; null when the exercise is not in the local
 * catalog (RN-CAT-04). An error in either ends both (Observer contract).
 */
export class ObserveExerciseDetail {
  constructor(
    private readonly exercises: Pick<ExerciseRepository, 'observeById'>,
    private readonly workouts: Pick<WorkoutRepository, 'observeFinished'>,
  ) {}

  execute(id: Id, observer: Observer<ExerciseDetail | null>): Unsubscribe {
    let exercise: Exercise | null | undefined;
    let finished: Workout[] | undefined;
    let active = true;

    const emit = () => {
      if (!active || exercise === undefined || finished === undefined) return;
      observer.next(
        exercise && {
          exercise,
          hasProgress: exerciseExposures(exercise.id, finished).length > 0,
        },
      );
    };
    const fail = (error: unknown) => {
      if (!active) return;
      stop();
      observer.error(error);
    };

    // The first query runs while subscribing (observeQuery), so an error can come before both
    // subscriptions exist: `stop` only cancels the ones already made.
    const subscriptions: Unsubscribe[] = [];
    const stop = () => {
      active = false;
      subscriptions.forEach((unsubscribe) => unsubscribe());
    };

    subscriptions.push(
      this.exercises.observeById(id, {
        next: (value) => {
          exercise = value;
          emit();
        },
        error: fail,
      }),
    );
    if (!active) {
      stop();
      return stop;
    }
    subscriptions.push(
      this.workouts.observeFinished({
        next: (value) => {
          finished = value;
          emit();
        },
        error: fail,
      }),
    );
    if (!active) stop();
    return stop;
  }
}
