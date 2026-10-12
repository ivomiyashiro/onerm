import type { Exercise } from '@/domain/models/exercise';
import type { Prescription } from '@/domain/models/prescription';
import type { Profile } from '@/domain/models/profile';
import type { Routine } from '@/domain/models/routine';
import type { RoutineTemplate } from '@/domain/models/routine-template';
import type { Id, TrainingGoal } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import type { ExerciseRepository } from '@/domain/repositories/exercise-repository';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type { RoutineRepository } from '@/domain/repositories/routine-repository';
import type { RoutineTemplateRepository } from '@/domain/repositories/routine-template-repository';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import { sortByPosition } from '@/domain/rules/position-order';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { prescriptionFor } from '@/domain/rules/routine/prescription-defaults';
import { templateMinutes } from '@/domain/rules/routine/session-duration';
import { observeTogether } from '@/domain/usecases/observe-together';

/** What S14 shows: the template with the prescription it would get for this profile. */
export interface TemplateDetail {
  readonly template: RoutineTemplate;
  readonly goal: TrainingGoal;
  /** C-06, for the goal of the profile. */
  readonly minutes: number;
  readonly days: {
    readonly id: Id;
    readonly name: string;
    readonly exercises: {
      readonly id: Id;
      /** Null while the exercise is not in the local catalog (RN-CAT-04). */
      readonly name: string | null;
      readonly prescription: Prescription;
    }[];
  }[];
  /** D07 names it when adopting would replace it (RF-RUT-02.AC2). */
  readonly activeRoutine: { readonly id: Id; readonly name: string } | null;
  /** RN-RUT-09: adopting shows D14 instead. */
  readonly hasWorkoutInProgress: boolean;
}

/** S14 (RF-RUT-01.AC2, AC3). Null when the template is not in the local catalog. */
export class ObserveTemplate {
  constructor(
    private readonly templates: Pick<RoutineTemplateRepository, 'observeAll'>,
    private readonly profiles: Pick<ProfileRepository, 'observe'>,
    private readonly routines: Pick<RoutineRepository, 'observeAll'>,
    private readonly workouts: Pick<WorkoutRepository, 'observeInProgress'>,
    private readonly exercises: Pick<ExerciseRepository, 'observeAll'>,
  ) {}

  execute(id: Id, observer: Observer<TemplateDetail | null>): Unsubscribe {
    return observeTogether<
      [RoutineTemplate[], Profile | null, Routine[], Workout | null, Exercise[]]
    >(
      [
        (o) => this.templates.observeAll(o),
        (o) => this.profiles.observe(o),
        (o) => this.routines.observeAll(o),
        (o) => this.workouts.observeInProgress(o),
        (o) => this.exercises.observeAll(o),
      ],
      {
        next: ([templates, storedProfile, routines, inProgress, exercises]) => {
          const template = templates.find((t) => t.id === id);
          if (template === undefined) return observer.next(null);
          const profile = storedProfile ?? defaultProfile();
          const names = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
          const active = routines.find((r) => r.id === profile.activeRoutineId);
          observer.next({
            template,
            goal: profile.goal,
            minutes: templateMinutes(template, profile),
            days: sortByPosition(template.days).map((day) => ({
              id: day.id,
              name: day.name,
              exercises: sortByPosition(day.exercises).map((exercise) => ({
                id: exercise.id,
                name: names.get(exercise.exerciseId) ?? null,
                prescription: prescriptionFor(exercise, profile),
              })),
            })),
            activeRoutine: active ? { id: active.id, name: active.name } : null,
            hasWorkoutInProgress: inProgress !== null,
          });
        },
        error: (error) => observer.error(error),
      },
    );
  }
}
