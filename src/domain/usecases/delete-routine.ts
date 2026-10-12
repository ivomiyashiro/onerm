import type { Profile } from '@/domain/models/profile';
import type { Id } from '@/domain/models/vocabulary';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type { RoutineRepository } from '@/domain/repositories/routine-repository';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import { firstValue } from '@/domain/usecases/observe-together';
import {
  hasWorkoutInProgress,
  setActiveRoutine,
  type RoutineChange,
} from '@/domain/usecases/routine-change';

/**
 * RF-RUT-08: deletes a routine logically; its workouts stay in the history (RN-RUT-07). The active
 * one can't be deleted during a workout (RN-RUT-09). The routine goes first: if clearing the
 * profile then failed, the weak reference to a deleted routine already counts as none (RN-RUT-02).
 */
export class DeleteRoutine {
  constructor(
    private readonly routines: Pick<RoutineRepository, 'delete'>,
    private readonly profiles: Pick<ProfileRepository, 'observe' | 'save'>,
    private readonly workouts: Pick<WorkoutRepository, 'observeInProgress'>,
  ) {}

  async execute(routineId: Id): Promise<RoutineChange> {
    const profile = await firstValue<Profile | null>((o) => this.profiles.observe(o));
    const isActive = profile?.activeRoutineId === routineId;
    if (isActive && (await hasWorkoutInProgress(this.workouts))) {
      return { status: 'workoutInProgress' };
    }
    await this.routines.delete(routineId);
    if (isActive) await setActiveRoutine(this.profiles, null);
    return { status: 'done' };
  }
}
