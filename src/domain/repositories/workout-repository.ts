import type { Workout } from '@/domain/models/workout';
import type { Id } from '@/domain/models/vocabulary';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';

/** The workout aggregate is read and written as a whole (06 §2). */
export interface WorkoutRepository {
  /** The workout in progress, or null. There is at most one (I-04, RN-ENT-01). */
  observeInProgress(observer: Observer<Workout | null>): Unsubscribe;
  /** The finished workouts, by `finishedAt`: the history the engine folds (RN-SUG-01). */
  observeFinished(observer: Observer<Workout[]>): Unsubscribe;
  observeById(id: Id, observer: Observer<Workout | null>): Unsubscribe;
  save(workout: Workout): Promise<void>;
  /**
   * Discarding a workout in progress deletes it physically: it never left the device (RN-SYNC-13).
   * Deleting a finished one is logical, with its children (06 §3, I-07).
   */
  delete(id: Id): Promise<void>;
}
