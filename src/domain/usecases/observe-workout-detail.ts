import type { Exercise } from '@/domain/models/exercise';
import type { Profile } from '@/domain/models/profile';
import type { EffortMode, Id, LoadUnit } from '@/domain/models/vocabulary';
import type { Workout, WorkoutExercise } from '@/domain/models/workout';
import type { ExerciseRepository } from '@/domain/repositories/exercise-repository';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import { sortByPosition } from '@/domain/rules/position-order';
import { effectiveSets, workoutMinutes } from '@/domain/rules/progress/workout-stats';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import type { LoadGrid } from '@/domain/rules/suggestion/load-grid';
import { loadGridFor } from '@/domain/rules/suggestion/load-grid-for';
import { isSubstitution } from '@/domain/rules/substitution';
import { observeTogether } from '@/domain/usecases/observe-together';
import { recordsOf, type SummaryRecord } from '@/domain/usecases/observe-workout-summary';

/** An exercise of S19 with what its rows and the «Editar serie» sheet need. */
export interface DetailExercise {
  readonly exercise: WorkoutExercise;
  /** Null while it is not in the local catalog (RN-CAT-04). */
  readonly name: string | null;
  readonly catalog: Exercise | null;
  /** «Sustituye a {ejercicio}» (RF-ENT-09.AC5); null when it is not a substitute. */
  readonly plannedName: string | null;
  /** The ± step (RN-PERF-06); null for bodyweight. */
  readonly grid: LoadGrid | null;
}

/** S19 · Detalle de entrenamiento (RF-PROG-02). */
export interface WorkoutDetail {
  readonly id: Id;
  readonly dayName: string;
  readonly routineName: string;
  readonly finishedAt: Date;
  readonly minutes: number;
  readonly sets: number;
  readonly records: readonly SummaryRecord[];
  readonly exercises: readonly DetailExercise[];
  readonly unit: LoadUnit;
  readonly effortMode: EffortMode;
}

/**
 * S19 (RF-PROG-02.AC1): a finished workout with its exercises, substitutes, skipped ones and the
 * records it beat, from the current data, so a correction shows at once. Null once it is gone.
 */
export class ObserveWorkoutDetail {
  constructor(
    private readonly profiles: Pick<ProfileRepository, 'observe'>,
    private readonly workouts: Pick<WorkoutRepository, 'observeFinished'>,
    private readonly exercises: Pick<ExerciseRepository, 'observeAll'>,
  ) {}

  execute(workoutId: Id, observer: Observer<WorkoutDetail | null>): Unsubscribe {
    return observeTogether<[Workout[], Profile | null, Exercise[]]>(
      [
        (o) => this.workouts.observeFinished(o),
        (o) => this.profiles.observe(o),
        (o) => this.exercises.observeAll(o),
      ],
      {
        next: ([finished, storedProfile, exercises]) => {
          const workout = finished.find((w) => w.id === workoutId);
          if (workout === undefined || workout.finishedAt === null) return observer.next(null);
          const profile = storedProfile ?? defaultProfile();
          const catalog = new Map(exercises.map((exercise) => [exercise.id, exercise]));
          const nameOf = (id: Id) => catalog.get(id)?.name ?? null;
          observer.next({
            id: workout.id,
            dayName: workout.dayNameSnapshot,
            routineName: workout.routineNameSnapshot,
            finishedAt: workout.finishedAt,
            minutes: workoutMinutes(workout),
            sets: effectiveSets(workout),
            records: recordsOf(workout, finished, nameOf),
            exercises: sortByPosition(workout.exercises).map((exercise) => {
              const entry = catalog.get(exercise.exerciseId) ?? null;
              return {
                exercise: { ...exercise, sets: sortByPosition(exercise.sets) },
                name: entry?.name ?? null,
                catalog: entry,
                plannedName:
                  isSubstitution(exercise) && exercise.plannedExerciseId !== null
                    ? nameOf(exercise.plannedExerciseId)
                    : null,
                grid: exercise.loadType === 'bodyweight' ? null : loadGridFor(profile, entry),
              };
            }),
            unit: profile.unit,
            effortMode: profile.effortMode,
          });
        },
        error: (error) => observer.error(error),
      },
    );
  }
}
