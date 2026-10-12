import type { Profile } from '@/domain/models/profile';
import type { Id } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { firstValue } from '@/domain/usecases/observe-together';

/**
 * The result of adopting, activating or deleting a routine. With a workout in progress the active
 * routine can't change, and the UI shows D14 (RN-RUT-09).
 */
export type RoutineChange = { status: 'done' } | { status: 'workoutInProgress' };

export async function hasWorkoutInProgress(
  workouts: Pick<WorkoutRepository, 'observeInProgress'>,
): Promise<boolean> {
  return (await firstValue<Workout | null>((o) => workouts.observeInProgress(o))) !== null;
}

/**
 * I-01: the active routine lives in the profile. Before the onboarding there is no profile yet, so
 * the guest's is created with the defaults (RN-PERF-02); the onboarding stays pending.
 */
export async function setActiveRoutine(
  profiles: Pick<ProfileRepository, 'observe' | 'save'>,
  activeRoutineId: Id | null,
): Promise<void> {
  const profile: Profile =
    (await firstValue<Profile | null>((o) => profiles.observe(o))) ?? defaultProfile();
  await profiles.save({ ...profile, activeRoutineId });
}
