import type { Exercise } from '@/domain/models/exercise';
import type { LocalDate } from '@/domain/models/local-date';
import type { Prescription } from '@/domain/models/prescription';
import type { Profile } from '@/domain/models/profile';
import type { RotationDay, Routine } from '@/domain/models/routine';
import type { Id } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import type { ExerciseRepository } from '@/domain/repositories/exercise-repository';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type { RoutineRepository } from '@/domain/repositories/routine-repository';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import { daysBetween } from '@/domain/rules/calendar';
import { sortByPosition } from '@/domain/rules/position-order';
import { dayKind, type DayKind } from '@/domain/rules/routine/day-kind';
import { lastDoneByDay } from '@/domain/rules/routine/last-done';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { nextDay } from '@/domain/rules/routine/next-day';
import { sessionMinutes } from '@/domain/rules/routine/session-duration';
import type { Suggestion } from '@/domain/rules/suggestion/suggestion';
import { suggestionFor } from '@/domain/rules/workout/suggestion-for';
import { observeTogether } from '@/domain/usecases/observe-together';

export interface NextDayExercise {
  readonly id: Id;
  readonly exerciseId: Id;
  /** Null while the exercise is not in the local catalog (RN-CAT-04). */
  readonly name: string | null;
  readonly prescription: Prescription;
  /** RF-SUG-01.AC1: a load and reps, or the instruction to calibrate. */
  readonly suggestion: Suggestion;
}

/** A day of S08 · Elegir día (RF-ENT-01.AC3). */
export interface DayChoice {
  readonly id: Id;
  readonly name: string;
  /** Calendar days since it was last done with this routine; null if never (RN-GEN-01). */
  readonly daysAgo: number | null;
  readonly exerciseNames: (string | null)[];
}

/** What S07 shows: the next day of the active routine, or that there is none. */
export type NextDayOverview =
  | { readonly kind: 'noActiveRoutine' }
  | {
      readonly kind: 'nextDay';
      readonly routine: { readonly id: Id; readonly name: string; readonly dayCount: number };
      readonly day: {
        readonly id: Id;
        readonly name: string;
        readonly exercises: NextDayExercise[];
      };
      readonly sets: number;
      /** C-06. */
      readonly minutes: number;
      /** Picks the photo of Inicio (marca §9). */
      readonly dayKind: DayKind;
      /** Every day of the routine, for S08; `day` is the recommended one. */
      readonly days: DayChoice[];
    };

const NO_ACTIVE_ROUTINE: NextDayOverview = { kind: 'noActiveRoutine' };

/**
 * S07: the next day of the active routine (RN-RUT-01), recomputed after any change in the
 * profile, the routines or the history. A weak reference to a missing routine is no routine
 * (RN-RUT-02).
 */
export class ObserveNextDay {
  constructor(
    private readonly profiles: Pick<ProfileRepository, 'observe'>,
    private readonly routines: Pick<RoutineRepository, 'observeAll' | 'observeRotationDays'>,
    private readonly workouts: Pick<WorkoutRepository, 'observeFinished'>,
    private readonly exercises: Pick<ExerciseRepository, 'observeAll'>,
    private readonly now: () => Date,
    private readonly localDate: (instant: Date) => LocalDate,
  ) {}

  execute(observer: Observer<NextDayOverview>): Unsubscribe {
    return observeTogether<[Profile | null, Routine[], RotationDay[], Workout[], Exercise[]]>(
      [
        (o) => this.profiles.observe(o),
        (o) => this.routines.observeAll(o),
        (o) => this.routines.observeRotationDays(o),
        (o) => this.workouts.observeFinished(o),
        (o) => this.exercises.observeAll(o),
      ],
      {
        next: ([profile, routines, rotationDays, finished, exercises]) => {
          const routine = routines.find((r) => r.id === profile?.activeRoutineId);
          if (routine === undefined) return observer.next(NO_ACTIVE_ROUTINE);
          const dayId = nextDay(
            routine.id,
            rotationDays.filter((day) => day.routineId === routine.id),
            finished,
          );
          const day = routine.days.find((d) => d.id === dayId);
          if (day === undefined) return observer.next(NO_ACTIVE_ROUTINE);

          const catalog = new Map(exercises.map((exercise) => [exercise.id, exercise]));
          const today = this.localDate(this.now());
          const inputs = {
            profile: profile ?? defaultProfile(),
            catalog,
            finished,
            today,
            localDate: this.localDate,
          };
          const lastDone = lastDoneByDay(routine.id, finished);
          const prescriptions = day.exercises.map((exercise) => exercise.prescription);
          observer.next({
            kind: 'nextDay',
            routine: { id: routine.id, name: routine.name, dayCount: routine.days.length },
            day: {
              id: day.id,
              name: day.name,
              exercises: day.exercises.map(({ id, exerciseId, prescription }) => ({
                id,
                exerciseId,
                name: catalog.get(exerciseId)?.name ?? null,
                prescription,
                suggestion: suggestionFor(
                  { routineExerciseId: id, exerciseId, prescription },
                  inputs,
                ),
              })),
            },
            sets: prescriptions.reduce((total, { sets }) => total + sets, 0),
            minutes: sessionMinutes(prescriptions),
            dayKind: dayKind(
              day.exercises.map((e) => catalog.get(e.exerciseId)?.primaryMuscles ?? []),
            ),
            days: sortByPosition(routine.days).map((d) => {
              const done = lastDone.get(d.id);
              return {
                id: d.id,
                name: d.name,
                daysAgo: done === undefined ? null : daysBetween(this.localDate(done), today),
                exerciseNames: d.exercises.map((e) => catalog.get(e.exerciseId)?.name ?? null),
              };
            }),
          });
        },
        error: (error) => observer.error(error),
      },
    );
  }
}
