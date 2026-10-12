import type { Profile } from '@/domain/models/profile';
import type { RotationDay, Routine } from '@/domain/models/routine';
import type { RoutineTemplate } from '@/domain/models/routine-template';
import type { Id } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type { RoutineRepository } from '@/domain/repositories/routine-repository';
import type { RoutineTemplateRepository } from '@/domain/repositories/routine-template-repository';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';

/**
 * In-memory repositories for use case tests: they keep what is saved and re-emit to every
 * observer after a write, like the SQLite ones do after a table change. Used by tests only.
 */
class Observable<T> {
  private readonly observers = new Set<Observer<T>>();

  constructor(private readonly read: () => T) {}

  observe(observer: Observer<T>): Unsubscribe {
    this.observers.add(observer);
    observer.next(this.read());
    return () => this.observers.delete(observer);
  }

  changed() {
    const value = this.read();
    this.observers.forEach((observer) => observer.next(value));
  }

  fail(error: unknown) {
    this.observers.forEach((observer) => observer.error(error));
    this.observers.clear();
  }
}

export class InMemoryProfileRepository implements ProfileRepository {
  private readonly profile$ = new Observable(() => this.profile);

  constructor(public profile: Profile | null = null) {}

  observe(observer: Observer<Profile | null>): Unsubscribe {
    return this.profile$.observe(observer);
  }

  async save(profile: Profile): Promise<void> {
    this.profile = profile;
    this.profile$.changed();
  }

  fail(error: unknown = new Error('disk')) {
    this.profile$.fail(error);
  }
}

export class InMemoryRoutineRepository implements RoutineRepository {
  /** Deleted routines stay here, so their days still count for the rotation (RN-RUT-01). */
  private readonly deleted = new Map<Id, Routine>();
  private readonly all$ = new Observable(() => [...this.routines]);

  constructor(public routines: Routine[] = []) {}

  observeAll(observer: Observer<Routine[]>): Unsubscribe {
    return this.all$.observe(observer);
  }

  observeById(id: Id, observer: Observer<Routine | null>): Unsubscribe {
    return this.all$.observe({
      next: (routines) => observer.next(routines.find((r) => r.id === id) ?? null),
      error: (error) => observer.error(error),
    });
  }

  observeRotationDays(observer: Observer<RotationDay[]>): Unsubscribe {
    return this.all$.observe({
      next: (routines) =>
        observer.next([
          ...routines.flatMap((r) => rotationDays(r, false)),
          ...[...this.deleted.values()].flatMap((r) => rotationDays(r, true)),
        ]),
      error: (error) => observer.error(error),
    });
  }

  async save(routine: Routine): Promise<void> {
    const index = this.routines.findIndex((r) => r.id === routine.id);
    if (index === -1) this.routines.push(routine);
    else this.routines[index] = routine;
    this.all$.changed();
  }

  async delete(id: Id): Promise<void> {
    const routine = this.routines.find((r) => r.id === id);
    if (routine) this.deleted.set(id, routine);
    this.routines = this.routines.filter((r) => r.id !== id);
    this.all$.changed();
  }

  fail(error: unknown = new Error('disk')) {
    this.all$.fail(error);
  }
}

function rotationDays(routine: Routine, isDeleted: boolean): RotationDay[] {
  return routine.days.map(({ id, routineId, position }) => ({
    id,
    routineId,
    position,
    isDeleted,
  }));
}

export class InMemoryRoutineTemplateRepository implements RoutineTemplateRepository {
  private readonly all$ = new Observable(() => this.templates);

  constructor(public templates: RoutineTemplate[] = []) {}

  observeAll(observer: Observer<RoutineTemplate[]>): Unsubscribe {
    return this.all$.observe(observer);
  }
}

/** Only the reads the routine use cases need; writes come with the workout cards. */
export class InMemoryWorkoutRepository implements Pick<
  WorkoutRepository,
  'observeInProgress' | 'observeFinished'
> {
  private readonly inProgress$ = new Observable(() => this.inProgress);
  private readonly finished$ = new Observable(() => this.finished);

  constructor(
    public inProgress: Workout | null = null,
    public finished: Workout[] = [],
  ) {}

  observeInProgress(observer: Observer<Workout | null>): Unsubscribe {
    return this.inProgress$.observe(observer);
  }

  observeFinished(observer: Observer<Workout[]>): Unsubscribe {
    return this.finished$.observe(observer);
  }
}
