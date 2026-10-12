import type { Profile } from '@/domain/models/profile';
import type { RoutineTemplate } from '@/domain/models/routine-template';
import type { Id } from '@/domain/models/vocabulary';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type { RoutineRepository } from '@/domain/repositories/routine-repository';
import type { RoutineTemplateRepository } from '@/domain/repositories/routine-template-repository';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { routineFromTemplate } from '@/domain/rules/routine/routine-from-template';
import { firstValue } from '@/domain/usecases/observe-together';
import {
  hasWorkoutInProgress,
  setActiveRoutine,
  type RoutineChange,
} from '@/domain/usecases/routine-change';

/**
 * RF-RUT-02: copies a template into a routine of the user (RN-RUT-03) with the prescription for
 * their goal and level (RN-PERF-03), and makes it the active one. The previous active routine
 * stays in Mis rutinas; the UI asks first with D07. Two writes: the routine first, so a failure
 * in the second leaves it saved and inactive, which «Activar» recovers.
 */
export class AdoptTemplate {
  constructor(
    private readonly templates: Pick<RoutineTemplateRepository, 'observeAll'>,
    private readonly routines: Pick<RoutineRepository, 'save'>,
    private readonly profiles: Pick<ProfileRepository, 'observe' | 'save'>,
    private readonly workouts: Pick<WorkoutRepository, 'observeInProgress'>,
    private readonly newId: () => Id,
  ) {}

  async execute(templateId: Id): Promise<RoutineChange> {
    if (await hasWorkoutInProgress(this.workouts)) return { status: 'workoutInProgress' };

    const templates = await firstValue<RoutineTemplate[]>((o) => this.templates.observeAll(o));
    const template = templates.find((t) => t.id === templateId);
    if (template === undefined) throw new Error(`Template ${templateId} is not in the catalog`);
    const profile =
      (await firstValue<Profile | null>((o) => this.profiles.observe(o))) ?? defaultProfile();

    const routine = routineFromTemplate(template, profile, this.newId);
    await this.routines.save(routine);
    await setActiveRoutine(this.profiles, routine.id);
    return { status: 'done' };
  }
}
