import type { Id } from '@/domain/models/vocabulary';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import {
  hasWorkoutInProgress,
  setActiveRoutine,
  type RoutineChange,
} from '@/domain/usecases/routine-change';

/** RF-RUT-07: the routine becomes the only active one (RN-RUT-02), never during a workout. */
export class ActivateRoutine {
  constructor(
    private readonly profiles: Pick<ProfileRepository, 'observe' | 'save'>,
    private readonly workouts: Pick<WorkoutRepository, 'observeInProgress'>,
  ) {}

  async execute(routineId: Id): Promise<RoutineChange> {
    if (await hasWorkoutInProgress(this.workouts)) return { status: 'workoutInProgress' };
    await setActiveRoutine(this.profiles, routineId);
    return { status: 'done' };
  }
}
