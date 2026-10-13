import type { Exercise } from '@/domain/models/exercise';
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
import { dayKind, type DayKind } from '@/domain/rules/routine/day-kind';
import { nextDay } from '@/domain/rules/routine/next-day';
import { sessionMinutes } from '@/domain/rules/routine/session-duration';
import { observeTogether } from '@/domain/usecases/observe-together';

export interface NextDayExercise {
  readonly id: Id;
  readonly exerciseId: Id;
  /** Null while the exercise is not in the local catalog (RN-CAT-04). */
  readonly name: string | null;
  readonly prescription: Prescription;
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
              })),
            },
            sets: prescriptions.reduce((total, { sets }) => total + sets, 0),
            minutes: sessionMinutes(prescriptions),
            dayKind: dayKind(
              day.exercises.map((e) => catalog.get(e.exerciseId)?.primaryMuscles ?? []),
            ),
          });
        },
        error: (error) => observer.error(error),
      },
    );
  }
}
