import type { Exercise } from '@/domain/models/exercise';
import type { LocalDate } from '@/domain/models/local-date';
import type { Profile } from '@/domain/models/profile';
import type { Id, LoadUnit } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import type { ExerciseRepository } from '@/domain/repositories/exercise-repository';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import { exerciseProgress, type ExposureProgress } from '@/domain/rules/progress/exercise-progress';
import { periodStart, type ProgressPeriod } from '@/domain/rules/progress/period';
import { personalRecords, type PersonalRecords } from '@/domain/rules/progress/personal-records';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { exerciseExposures } from '@/domain/rules/suggestion/exposures';
import { observeTogether } from '@/domain/usecases/observe-together';

/** S20 · Progreso de ejercicio (RF-PROG-04, RF-PROG-05). */
export interface ExerciseProgressView {
  /** Null while it is not in the local catalog (RN-CAT-04). */
  readonly name: string | null;
  /** ADR-0005: reps instead of e1RM (AC6). */
  readonly isBodyweight: boolean;
  readonly unit: LoadUnit;
  /** One per EE in the period, in order (RN-PROG-01). */
  readonly points: readonly ExposureProgress[];
  /** RN-PROG-03 over the whole history, from the current data (RF-PROG-05.AC1, AC3). */
  readonly records: PersonalRecords;
  /** The latest exposure, whatever the period: «Reps totales · última vez». */
  readonly last: ExposureProgress | null;
}

/**
 * S20: the progress of one exercise over all its EE, in any routine or day (RN-PROG-01), limited
 * to a period for the chart (RF-PROG-04.AC3). Null without any exposure.
 */
export class ObserveExerciseProgress {
  constructor(
    private readonly profiles: Pick<ProfileRepository, 'observe'>,
    private readonly workouts: Pick<WorkoutRepository, 'observeFinished'>,
    private readonly exercises: Pick<ExerciseRepository, 'observeAll'>,
    private readonly now: () => Date,
    private readonly localDate: (instant: Date) => LocalDate,
  ) {}

  execute(
    exerciseId: Id,
    period: ProgressPeriod,
    observer: Observer<ExerciseProgressView | null>,
  ): Unsubscribe {
    return observeTogether<[Workout[], Profile | null, Exercise[]]>(
      [
        (o) => this.workouts.observeFinished(o),
        (o) => this.profiles.observe(o),
        (o) => this.exercises.observeAll(o),
      ],
      {
        next: ([finished, profile, exercises]) => {
          const exposures = exerciseExposures(exerciseId, finished);
          if (exposures.length === 0) return observer.next(null);
          const all = exerciseProgress(exposures);
          const start = periodStart(period, this.localDate(this.now()));
          const exercise = exercises.find((e) => e.id === exerciseId) ?? null;
          observer.next({
            name: exercise?.name ?? null,
            isBodyweight: exercise?.loadType === 'bodyweight',
            unit: (profile ?? defaultProfile()).unit,
            points: start === null ? all : all.filter((point) => this.localDate(point.at) >= start),
            records: personalRecords(exposures),
            last: all.at(-1) ?? null,
          });
        },
        error: (error) => observer.error(error),
      },
    );
  }
}
