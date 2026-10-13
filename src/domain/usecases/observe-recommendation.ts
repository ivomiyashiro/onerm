import type { Profile } from '@/domain/models/profile';
import type { RoutineTemplate } from '@/domain/models/routine-template';
import type { TrainingGoal } from '@/domain/models/vocabulary';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type { RoutineTemplateRepository } from '@/domain/repositories/routine-template-repository';
import { templateMinutes } from '@/domain/rules/routine/session-duration';
import {
  recommendTemplate,
  type RecommendationNote,
} from '@/domain/rules/routine/template-recommendation';
import { observeTogether } from '@/domain/usecases/observe-together';

/** What S06 shows. */
export interface Recommendation {
  readonly template: RoutineTemplate;
  /** C-06, for the goal and level of the profile. */
  readonly minutes: number;
  /** The strength goal shows the «sin barra» notice (RF-PERF-02.AC6). */
  readonly goal: TrainingGoal;
  readonly alternative: RoutineTemplate | null;
  readonly note: RecommendationNote | null;
}

/**
 * RF-PERF-02: the template for the onboarding answers (RN-PERF-01). Null without a profile or
 * while the catalog has no templates.
 */
export class ObserveRecommendation {
  constructor(
    private readonly templates: Pick<RoutineTemplateRepository, 'observeAll'>,
    private readonly profiles: Pick<ProfileRepository, 'observe'>,
  ) {}

  execute(observer: Observer<Recommendation | null>): Unsubscribe {
    return observeTogether<[RoutineTemplate[], Profile | null]>(
      [(o) => this.templates.observeAll(o), (o) => this.profiles.observe(o)],
      {
        next: ([templates, profile]) => {
          const result = profile && recommendTemplate(templates, profile);
          observer.next(
            profile && result
              ? {
                  template: result.recommended,
                  minutes: templateMinutes(result.recommended, profile),
                  goal: profile.goal,
                  alternative: result.alternative,
                  note: result.note,
                }
              : null,
          );
        },
        error: observer.error,
      },
    );
  }
}
