import type { Exercise } from '@/domain/models/exercise';
import type { LocalDate } from '@/domain/models/local-date';
import type { Profile } from '@/domain/models/profile';
import type { Routine } from '@/domain/models/routine';
import type { EffortMode } from '@/domain/models/vocabulary';
import type { Workout, WorkoutExercise } from '@/domain/models/workout';
import type { ExerciseRepository } from '@/domain/repositories/exercise-repository';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type { RoutineRepository } from '@/domain/repositories/routine-repository';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import type { LoadGrid } from '@/domain/rules/suggestion/load-grid';
import { loadGridFor } from '@/domain/rules/suggestion/load-grid-for';
import type { Suggestion } from '@/domain/rules/suggestion/suggestion';
import { suggestionFor } from '@/domain/rules/workout/suggestion-for';
import { observeTogether } from '@/domain/usecases/observe-together';

export interface WorkoutExerciseView {
  readonly exercise: WorkoutExercise;
  /** Null while it is not in the local catalog (RN-CAT-04). */
  readonly name: string | null;
  /** From the catalog, for the load convention (RN-ENT-05). */
  readonly catalog: Exercise | null;
  /** The note of the routine exercise (RF-RUT-06.AC2). */
  readonly notes: string | null;
  readonly suggestion: Suggestion;
  /** The ± step (RN-PERF-06); null for bodyweight. */
  readonly grid: LoadGrid | null;
}

/** S09: the workout in progress with what each exercise shows. */
export interface WorkoutOverview {
  readonly workout: Workout;
  readonly exercises: readonly WorkoutExerciseView[];
  readonly effortMode: EffortMode;
}

/**
 * Everything the engine reads from the history, as one string. SQLite re-emits the finished
 * workouts after any write to the workout tables, logging a set included; with the same key the
 * suggestions are kept, so «Hecho» never waits for the engine (RNF-03).
 */
function historyKey(finished: readonly Workout[]): string {
  return finished
    .map((w) =>
      [
        w.id,
        w.startedAt.getTime(),
        w.finishedAt?.getTime(),
        ...w.exercises.map((e) => [
          e.id,
          e.routineExerciseId,
          e.exerciseId,
          JSON.stringify(e.sets),
        ]),
      ].join('|'),
    )
    .join('\n');
}

/**
 * S09 (RF-ENT-02, RF-SUG-01.AC2): the workout in progress, or null. Its suggestions use the
 * history before it started (RN-SUG-17): the day of `startedAt` is "today".
 */
export class ObserveWorkout {
  constructor(
    private readonly profiles: Pick<ProfileRepository, 'observe'>,
    private readonly routines: Pick<RoutineRepository, 'observeAll'>,
    private readonly workouts: Pick<WorkoutRepository, 'observeInProgress' | 'observeFinished'>,
    private readonly exercises: Pick<ExerciseRepository, 'observeAll'>,
    private readonly localDate: (instant: Date) => LocalDate,
  ) {}

  execute(observer: Observer<WorkoutOverview | null>): Unsubscribe {
    let cache: { key: string; suggestions: Map<string, Suggestion> } | null = null;

    return observeTogether<[Workout | null, Workout[], Profile | null, Routine[], Exercise[]]>(
      [
        (o) => this.workouts.observeInProgress(o),
        (o) => this.workouts.observeFinished(o),
        (o) => this.profiles.observe(o),
        (o) => this.routines.observeAll(o),
        (o) => this.exercises.observeAll(o),
      ],
      {
        next: ([workout, finished, storedProfile, routines, exercises]) => {
          if (workout === null) return observer.next(null);
          const profile = storedProfile ?? defaultProfile();
          const catalog = new Map(exercises.map((exercise) => [exercise.id, exercise]));
          const notes = new Map(
            routines
              .flatMap((r) => r.days)
              .flatMap((d) => d.exercises)
              .map((e) => [e.id, e.notes]),
          );

          const key = [
            workout.id,
            JSON.stringify(profile),
            // What the engine and the grid read from the catalog (a sync can change it).
            exercises.map((e) => `${e.id}:${e.loadType}:${e.primaryEquipment}`).join(','),
            historyKey(finished),
          ].join('\n');
          if (cache?.key !== key) cache = { key, suggestions: new Map() };
          const { suggestions } = cache;
          const inputs = {
            profile,
            catalog,
            finished,
            today: this.localDate(workout.startedAt),
            localDate: this.localDate,
          };

          observer.next({
            workout,
            effortMode: profile.effortMode,
            exercises: workout.exercises.map((exercise) => {
              const entry = catalog.get(exercise.exerciseId) ?? null;
              const target = `${exercise.routineExerciseId}|${exercise.exerciseId}|${JSON.stringify(exercise.prescription)}`;
              let suggestion = suggestions.get(target);
              if (suggestion === undefined) {
                suggestion = suggestionFor(exercise, inputs);
                suggestions.set(target, suggestion);
              }
              return {
                exercise,
                name: entry?.name ?? null,
                catalog: entry,
                notes:
                  exercise.routineExerciseId === null
                    ? null
                    : (notes.get(exercise.routineExerciseId) ?? null),
                suggestion,
                grid: exercise.loadType === 'bodyweight' ? null : loadGridFor(profile, entry),
              };
            }),
          });
        },
        error: (error) => observer.error(error),
      },
    );
  }
}
