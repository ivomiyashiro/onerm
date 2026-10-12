import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutine, aWorkout } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { DeleteRoutine } from '@/domain/usecases/delete-routine';

const IN_PROGRESS = aWorkout({ status: 'in_progress', finishedAt: null });

function setup(inProgress = IN_PROGRESS as typeof IN_PROGRESS | null) {
  const profiles = new InMemoryProfileRepository({
    ...defaultProfile(),
    activeRoutineId: 'active',
  });
  const routines = new InMemoryRoutineRepository([
    aRoutine({ id: 'active' }),
    aRoutine({ id: 'other' }),
  ]);
  const deleteRoutine = new DeleteRoutine(
    routines,
    profiles,
    new InMemoryWorkoutRepository(inProgress),
  );
  return { deleteRoutine, profiles, routines };
}

describe('DeleteRoutine', () => {
  it('RF-RUT-08.AC1: the routine leaves Mis rutinas and the active one stays', async () => {
    const { deleteRoutine, profiles, routines } = setup(null);

    await expect(deleteRoutine.execute('other')).resolves.toEqual({ status: 'done' });

    expect(routines.routines.map((r) => r.id)).toEqual(['active']);
    expect(profiles.profile?.activeRoutineId).toBe('active');
  });

  it('RF-RUT-08.AC2: deleting the active routine leaves no active routine', async () => {
    const { deleteRoutine, profiles } = setup(null);

    await deleteRoutine.execute('active');

    expect(profiles.profile?.activeRoutineId).toBeNull();
  });

  it('RF-RUT-08.AC3: not the active one with a workout in progress (RN-RUT-09, D14)', async () => {
    const { deleteRoutine, routines } = setup();

    await expect(deleteRoutine.execute('active')).resolves.toEqual({
      status: 'workoutInProgress',
    });

    expect(routines.routines).toHaveLength(2);
  });

  it('RN-RUT-09: another routine can be deleted during a workout', async () => {
    const { deleteRoutine, routines } = setup();

    await expect(deleteRoutine.execute('other')).resolves.toEqual({ status: 'done' });

    expect(routines.routines.map((r) => r.id)).toEqual(['active']);
  });
});
