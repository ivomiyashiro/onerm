import type { Exercise } from '@/domain/models/exercise';
import type { LocalDate } from '@/domain/models/local-date';
import type { Profile } from '@/domain/models/profile';
import type { Routine } from '@/domain/models/routine';
import type { EffortMode, ExperienceLevel } from '@/domain/models/vocabulary';
import type { Workout, WorkoutExercise, WorkoutSet } from '@/domain/models/workout';
import type { ExerciseRepository } from '@/domain/repositories/exercise-repository';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type { RoutineRepository } from '@/domain/repositories/routine-repository';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import type { LoadGrid } from '@/domain/rules/suggestion/load-grid';
import { loadGridFor } from '@/domain/rules/suggestion/load-grid-for';
import type { SuggestionExplanation } from '@/domain/rules/suggestion/explanation';
import type { Suggestion } from '@/domain/rules/suggestion/suggestion';
import { currentSuggestion } from '@/domain/rules/workout/current-suggestion';
import { explanationFor } from '@/domain/rules/workout/suggestion-for';
import { observeTogether } from '@/domain/usecases/observe-together';

export interface WorkoutExerciseView {
  readonly exercise: WorkoutExercise;
  /** Null while it is not in the local catalog (RN-CAT-04). */
  readonly name: string | null;
  /** From the catalog, for the load convention (RN-ENT-05). */
  readonly catalog: Exercise | null;
  /** The note of the routine exercise (RF-RUT-06.AC2). */
  readonly notes: string | null;
  /** For the next set: in calibration it follows the sets logged (RN-SUG-06, RN-SUG-13). */
  readonly suggestion: Suggestion;
  /** The suggestion was recalculated from the last set: the next one shows it as is. */
  readonly recalculated: boolean;
  /** A calibration set still without its effort: the next set waits (RF-SUG-02.AC4). */
  readonly awaitingEffort: WorkoutSet | null;
  /** S10 «¿Por qué?» of `suggestion` (RF-SUG-07). */
  readonly explanation: SuggestionExplanation;
  /** The ± step (RN-PERF-06); null for bodyweight. */
  readonly grid: LoadGrid | null;
}

/** S09: the workout in progress with what each exercise shows. */
export interface WorkoutOverview {
  readonly workout: Workout;
  readonly exercises: readonly WorkoutExerciseView[];
  readonly effortMode: EffortMode;
  /** The short reason and S10 have a novice and an advanced version (13 §4). */
  readonly level: ExperienceLevel;
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
    let cache: { key: string; explanations: Map<string, SuggestionExplanation> } | null = null;

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
          if (cache?.key !== key) cache = { key, explanations: new Map() };
          const { explanations } = cache;
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
            level: profile.level,
            exercises: workout.exercises.map((exercise) => {
              const entry = catalog.get(exercise.exerciseId) ?? null;
              const target = `${exercise.routineExerciseId}|${exercise.exerciseId}|${JSON.stringify(exercise.prescription)}`;
              let base = explanations.get(target);
              if (base === undefined) {
                base = explanationFor(exercise, inputs);
                explanations.set(target, base);
              }
              const grid = exercise.loadType === 'bodyweight' ? null : loadGridFor(profile, entry);
              const current = currentSuggestion(base.suggestion, exercise.sets, {
                exerciseId: exercise.exerciseId,
                prescription: exercise.prescription,
                grid,
              });
              const { suggestion } = current;
              return {
                exercise,
                name: entry?.name ?? null,
                catalog: entry,
                notes:
                  exercise.routineExerciseId === null
                    ? null
                    : (notes.get(exercise.routineExerciseId) ?? null),
                ...current,
                // A calibration step comes from a set of today: there is no «last time» yet.
                explanation:
                  suggestion === base.suggestion
                    ? base
                    : { ...base, suggestion, lastTime: null, meanRir: null, estimatedMax: null },
                grid,
              };
            }),
          });
        },
        error: (error) => observer.error(error),
      },
    );
  }
}
