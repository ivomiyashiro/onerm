import type { Profile } from '@/domain/models/profile';
import type { Routine } from '@/domain/models/routine';
import type { RoutineTemplate } from '@/domain/models/routine-template';
import type { ExperienceLevel, Id } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type { RoutineRepository } from '@/domain/repositories/routine-repository';
import type { RoutineTemplateRepository } from '@/domain/repositories/routine-template-repository';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { routineMinutes, templateMinutes } from '@/domain/rules/routine/session-duration';
import { recommendTemplate } from '@/domain/rules/routine/template-recommendation';
import { observeTogether } from '@/domain/usecases/observe-together';

/** One card of S13: «{n} días · {nivel} · ~{min} min». */
export interface RoutineSummary {
  readonly id: Id;
  readonly name: string;
  readonly daysPerWeek: number;
  /** The suggested level of a template, or of the template a routine was adopted from. */
  readonly level: ExperienceLevel | null;
  /** C-06: the longest day. */
  readonly minutes: number;
}

/** What S13 shows in its two tabs, Mis rutinas and Plantillas. */
export interface RoutinesOverview {
  readonly routines: RoutineSummary[];
  /** Only when it points to a live routine (RN-RUT-02). */
  readonly activeRoutineId: Id | null;
  readonly templates: RoutineSummary[];
  /** RN-PERF-01. */
  readonly recommendedTemplateId: Id | null;
  /** The active routine can't change during a workout (RN-RUT-09): S13 shows D14 at once. */
  readonly hasWorkoutInProgress: boolean;
}

/**
 * S13 (RF-RUT-01, 07, 08). Before the onboarding the profile is missing: the defaults of
 * RN-PERF-02 choose the recommendation and the minutes.
 */
export class ObserveRoutines {
  constructor(
    private readonly routines: Pick<RoutineRepository, 'observeAll'>,
    private readonly templates: Pick<RoutineTemplateRepository, 'observeAll'>,
    private readonly profiles: Pick<ProfileRepository, 'observe'>,
    private readonly workouts: Pick<WorkoutRepository, 'observeInProgress'>,
  ) {}

  execute(observer: Observer<RoutinesOverview>): Unsubscribe {
    return observeTogether<[Routine[], RoutineTemplate[], Profile | null, Workout | null]>(
      [
        (o) => this.routines.observeAll(o),
        (o) => this.templates.observeAll(o),
        (o) => this.profiles.observe(o),
        (o) => this.workouts.observeInProgress(o),
      ],
      {
        next: ([routines, templates, storedProfile, inProgress]) => {
          const profile = storedProfile ?? defaultProfile();
          const templatesById = new Map(templates.map((t) => [t.id, t]));
          const activeRoutineId = profile.activeRoutineId;
          observer.next({
            routines: routines.map((routine) => {
              const source = templatesById.get(routine.sourceTemplateId ?? '');
              return {
                id: routine.id,
                name: routine.name,
                // A template's days rotate, so A/B is still 3 days a week (ADR-0006).
                daysPerWeek: source?.daysPerWeek ?? routine.days.length,
                level: source?.level ?? null,
                minutes: routineMinutes(routine),
              };
            }),
            activeRoutineId: routines.some((r) => r.id === activeRoutineId)
              ? activeRoutineId
              : null,
            templates: templates.map((template) => ({
              id: template.id,
              name: template.name,
              daysPerWeek: template.daysPerWeek,
              level: template.level,
              minutes: templateMinutes(template, profile),
            })),
            recommendedTemplateId: recommendTemplate(templates, profile)?.recommended.id ?? null,
            hasWorkoutInProgress: inProgress !== null,
          });
        },
        error: (error) => observer.error(error),
      },
    );
  }
}
