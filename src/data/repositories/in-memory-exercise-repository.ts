import type { Exercise } from '@/domain/models/exercise';
import type { ExerciseRepository } from '@/domain/repositories/exercise-repository';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';

/**
 * In-memory implementation used by the composition root until the SQLite repository (#29).
 * `replaceAll()` plays the role of a change in the local database.
 */
export class InMemoryExerciseRepository implements ExerciseRepository {
  private readonly observers = new Set<Observer<Exercise[]>>();

  constructor(private exercises: Exercise[]) {}

  observeAll(observer: Observer<Exercise[]>): Unsubscribe {
    this.observers.add(observer);
    observer.next([...this.exercises]);
    return () => {
      this.observers.delete(observer);
    };
  }

  replaceAll(exercises: Exercise[]): void {
    this.exercises = [...exercises];
    this.observers.forEach((observer) => observer.next([...this.exercises]));
  }
}
