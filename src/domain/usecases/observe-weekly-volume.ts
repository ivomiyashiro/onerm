import type { Exercise } from '@/domain/models/exercise';
import type { LocalDate } from '@/domain/models/local-date';
import type { Profile } from '@/domain/models/profile';
import type { Muscle } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import type { ExerciseRepository } from '@/domain/repositories/exercise-repository';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import { addDays, startOfWeek } from '@/domain/rules/calendar';
import { weeklyVolume } from '@/domain/rules/progress/weekly-volume';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { observeTogether } from '@/domain/usecases/observe-together';

/** S18 · Volumen (RF-PROG-06). */
export interface WeeklyVolume {
  /** Monday and Sunday of the week (RN-GEN-01). */
  readonly weekStart: LocalDate;
  readonly weekEnd: LocalDate;
  /** Fractional sets per muscle, most first; ties in the order of the vocabulary (RN-PROG-04). */
  readonly muscles: readonly { readonly muscle: Muscle; readonly sets: number }[];
  /** «2 de 3 entrenamientos»: finished in the week, over the days per week of the profile. */
  readonly workouts: number;
  readonly goal: number;
}

/** S18 «Volumen»: the week `weeksAgo` weeks before the current one (0 = «Esta semana», AC2). */
export class ObserveWeeklyVolume {
  constructor(
    private readonly profiles: Pick<ProfileRepository, 'observe'>,
    private readonly workouts: Pick<WorkoutRepository, 'observeFinished'>,
    private readonly exercises: Pick<ExerciseRepository, 'observeAll'>,
    private readonly now: () => Date,
    private readonly localDate: (instant: Date) => LocalDate,
  ) {}

  execute(weeksAgo: number, observer: Observer<WeeklyVolume>): Unsubscribe {
    return observeTogether<[Workout[], Profile | null, Exercise[]]>(
      [
        (o) => this.workouts.observeFinished(o),
        (o) => this.profiles.observe(o),
        (o) => this.exercises.observeAll(o),
      ],
      {
        next: ([finished, profile, exercises]) => {
          const weekStart = addDays(startOfWeek(this.localDate(this.now())), -7 * weeksAgo);
          const weekEnd = addDays(weekStart, 6);
          const catalog = new Map(exercises.map((exercise) => [exercise.id, exercise]));
          const volume = weeklyVolume(finished, catalog, weekStart, this.localDate);
          const inWeek = finished.filter((w) => {
            if (w.finishedAt === null) return false;
            const date = this.localDate(w.finishedAt);
            return date >= weekStart && date <= weekEnd;
          });
          observer.next({
            weekStart,
            weekEnd,
            muscles: Object.entries(volume)
              .map(([muscle, sets]) => ({ muscle: muscle as Muscle, sets }))
              // Array.sort is stable: equal volumes keep the order of MUSCLES.
              .sort((a, b) => b.sets - a.sets),
            workouts: inWeek.length,
            goal: (profile ?? defaultProfile()).daysPerWeek,
          });
        },
        error: (error) => observer.error(error),
      },
    );
  }
}
