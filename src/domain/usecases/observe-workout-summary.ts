import type { Exercise } from '@/domain/models/exercise';
import type { LocalDate } from '@/domain/models/local-date';
import type { Profile } from '@/domain/models/profile';
import type { RotationDay, Routine } from '@/domain/models/routine';
import type { Id, LoadUnit } from '@/domain/models/vocabulary';
import type { Workout, WorkoutExercise } from '@/domain/models/workout';
import type { ExerciseRepository } from '@/domain/repositories/exercise-repository';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type { RoutineRepository } from '@/domain/repositories/routine-repository';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import { limitingSide } from '@/domain/rules/limiting-side';
import { sortByPosition } from '@/domain/rules/position-order';
import { personalRecords, workoutRecords } from '@/domain/rules/progress/personal-records';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { nextDay } from '@/domain/rules/routine/next-day';
import type { E1rm } from '@/domain/rules/suggestion/e1rm';
import { exerciseExposures } from '@/domain/rules/suggestion/exposures';
import type { SuggestionCode } from '@/domain/rules/suggestion/suggestion';
import { isSubstitution } from '@/domain/rules/substitution';
import { suggestionFor } from '@/domain/rules/workout/suggestion-for';
import { isEffectiveSet } from '@/domain/rules/workout-set-rules';
import { observeTogether } from '@/domain/usecases/observe-together';

/** A record of RN-PROG-03 (a) or (b) beaten in the workout (RF-PROG-05.AC2). */
export type SummaryRecord =
  | {
      readonly kind: 'heaviestLoad';
      readonly name: string | null;
      readonly loadKg: number;
      readonly reps: number;
    }
  | { readonly kind: 'e1rm'; readonly name: string | null; readonly e1rm: E1rm };

/** «Lo que hiciste»: one line per workout exercise. */
export type SummaryLine =
  | {
      readonly name: string | null;
      readonly status: 'done';
      readonly sets: number;
      /** The heaviest effective set, by its limiting side; the most reps on a tie. */
      readonly best: { readonly loadKg: number | null; readonly reps: number };
      /** What the engine suggests next time, for its icon. */
      readonly next: SuggestionCode;
    }
  | { readonly name: string | null; readonly status: 'skipped' };

/** S12 · Resumen del entrenamiento (RF-ENT-11.AC1). */
export interface WorkoutSummary {
  readonly dayName: string;
  readonly minutes: number;
  /** Effective sets (RN-SUG-01). */
  readonly sets: number;
  readonly exercisesDone: number;
  readonly exercisesTotal: number;
  readonly records: readonly SummaryRecord[];
  readonly lines: readonly SummaryLine[];
  /** «Próximo: {día}» of its routine (RN-RUT-01); null if the routine is gone. */
  readonly nextDayName: string | null;
  readonly unit: LoadUnit;
}

function bestSet(exercise: WorkoutExercise) {
  let best: { loadKg: number | null; reps: number } | null = null;
  for (const set of exercise.sets.filter(isEffectiveSet)) {
    const reps = set.isUnilateral ? limitingSide(set).reps : set.reps;
    const load = set.loadKg ?? 0;
    const bestLoad = best?.loadKg ?? 0;
    if (best === null || load > bestLoad || (load === bestLoad && reps > best.reps)) {
      best = { loadKg: set.loadKg, reps };
    }
  }
  return best;
}

/**
 * S12 (RF-ENT-11.AC1): the summary of a finished workout, from the current data. Records are
 * highlighted only when the exercise had an earlier EE (RN-PROG-03). Null once it is gone.
 */
export class ObserveWorkoutSummary {
  constructor(
    private readonly profiles: Pick<ProfileRepository, 'observe'>,
    private readonly routines: Pick<RoutineRepository, 'observeAll' | 'observeRotationDays'>,
    private readonly workouts: Pick<WorkoutRepository, 'observeFinished'>,
    private readonly exercises: Pick<ExerciseRepository, 'observeAll'>,
    private readonly now: () => Date,
    private readonly localDate: (instant: Date) => LocalDate,
  ) {}

  execute(workoutId: Id, observer: Observer<WorkoutSummary | null>): Unsubscribe {
    return observeTogether<[Workout[], Profile | null, Routine[], RotationDay[], Exercise[]]>(
      [
        (o) => this.workouts.observeFinished(o),
        (o) => this.profiles.observe(o),
        (o) => this.routines.observeAll(o),
        (o) => this.routines.observeRotationDays(o),
        (o) => this.exercises.observeAll(o),
      ],
      {
        next: ([finished, storedProfile, routines, rotationDays, exercises]) => {
          const workout = finished.find((w) => w.id === workoutId);
          if (workout === undefined || workout.finishedAt === null) return observer.next(null);
          const profile = storedProfile ?? defaultProfile();
          const catalog = new Map(exercises.map((exercise) => [exercise.id, exercise]));
          const nameOf = (exerciseId: Id) => catalog.get(exerciseId)?.name ?? null;
          const inputs = {
            profile,
            catalog,
            finished,
            today: this.localDate(this.now()),
            localDate: this.localDate,
          };
          const ordered = sortByPosition(workout.exercises);

          const records: SummaryRecord[] = [];
          for (const exerciseId of new Set(ordered.map((e) => e.exerciseId))) {
            const exposures = exerciseExposures(exerciseId, finished);
            const beaten = workoutRecords(exposures, workout.id);
            const today = personalRecords(exposures.filter((e) => e.workoutId === workout.id));
            const name = nameOf(exerciseId);
            if (beaten.heaviestLoad && today.heaviestLoad) {
              const { loadKg, reps } = today.heaviestLoad;
              records.push({ kind: 'heaviestLoad', name, loadKg, reps });
            }
            if (beaten.e1rm && today.bestE1rm) {
              records.push({ kind: 'e1rm', name, e1rm: today.bestE1rm.e1rm });
            }
          }

          const lines = ordered.map((exercise): SummaryLine => {
            const name = nameOf(exercise.exerciseId);
            const best = bestSet(exercise);
            if (best === null) return { name, status: 'skipped' };
            const routineExerciseId = isSubstitution(exercise) ? null : exercise.routineExerciseId;
            const next = suggestionFor({ ...exercise, routineExerciseId }, inputs).reason.code;
            const sets = exercise.sets.filter(isEffectiveSet).length;
            return { name, status: 'done', sets, best, next };
          });

          const routine = routines.find((r) => r.id === workout.routineId);
          const nextDayId =
            routine === undefined
              ? null
              : nextDay(
                  routine.id,
                  rotationDays.filter((day) => day.routineId === routine.id),
                  finished,
                );
          const minutes = Math.round(
            (workout.finishedAt.getTime() - workout.startedAt.getTime()) / 60_000,
          );

          observer.next({
            dayName: workout.dayNameSnapshot,
            minutes,
            sets: lines.reduce(
              (total, line) => total + (line.status === 'done' ? line.sets : 0),
              0,
            ),
            exercisesDone: lines.filter((line) => line.status === 'done').length,
            exercisesTotal: lines.length,
            records,
            lines,
            nextDayName: routine?.days.find((d) => d.id === nextDayId)?.name ?? null,
            unit: profile.unit,
          });
        },
        error: (error) => observer.error(error),
      },
    );
  }
}
