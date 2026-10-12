import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aWorkout } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { ActivateRoutine } from '@/domain/usecases/activate-routine';

const IN_PROGRESS = aWorkout({ status: 'in_progress', finishedAt: null });

describe('ActivateRoutine', () => {
  it('RF-RUT-07.AC1: the routine becomes the only active one (RN-RUT-02)', async () => {
    const profiles = new InMemoryProfileRepository({ ...defaultProfile(), activeRoutineId: 'a' });
    const activate = new ActivateRoutine(profiles, new InMemoryWorkoutRepository());

    await expect(activate.execute('b')).resolves.toEqual({ status: 'done' });

    expect(profiles.profile?.activeRoutineId).toBe('b');
  });

  it('RF-RUT-07.AC2: not with a workout in progress (RN-RUT-09, D14)', async () => {
    const profiles = new InMemoryProfileRepository({ ...defaultProfile(), activeRoutineId: 'a' });
    const activate = new ActivateRoutine(profiles, new InMemoryWorkoutRepository(IN_PROGRESS));

    await expect(activate.execute('b')).resolves.toEqual({ status: 'workoutInProgress' });

    expect(profiles.profile?.activeRoutineId).toBe('a');
  });
});
