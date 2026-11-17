import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutine, aRoutineTemplate, aWorkout } from '@/domain/testing/builders';
import { firstValue } from '@/domain/testing/first-value';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { DeleteRoutine } from '@/domain/usecases/routines/delete-routine';
import {
  ObserveRoutines,
  type RoutinesOverview,
} from '@/domain/usecases/routines/observe-routines';

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

describe('DeleteRoutine: write order (spike #342, inventario: DeleteRoutine; ADR-0013)', () => {
  it('if clearing the active routine fails, the routine is gone and there is no active routine (RN-RUT-02)', async () => {
    const { deleteRoutine, profiles, routines } = setup(null);
    jest.spyOn(profiles, 'save').mockRejectedValue(new Error('disk full'));

    await expect(deleteRoutine.execute('active')).rejects.toThrow('disk full');

    expect(routines.routines.map((r) => r.id)).toEqual(['other']);
    const overview = await firstValue<RoutinesOverview>((o) =>
      new ObserveRoutines(
        routines,
        new InMemoryRoutineTemplateRepository([aRoutineTemplate()]),
        profiles,
        new InMemoryWorkoutRepository(null),
      ).execute(o),
    );
    expect(overview.activeRoutineId).toBeNull();
  });
});
