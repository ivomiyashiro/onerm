import type { Profile } from '@/domain/models/profile';
import type { Routine } from '@/domain/models/routine';
import type { Workout } from '@/domain/models/workout';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutine, aRoutineTemplate, aWorkout } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { AdoptTemplate } from '@/domain/usecases/adopt-template';

function setup(
  options: { profile?: Profile | null; routines?: Routine[]; inProgress?: Workout | null } = {},
) {
  const {
    profile = { ...defaultProfile(), goal: 'strength' },
    routines = [aRoutine({ id: 'mine' })],
    inProgress = null,
  } = options;
  const profiles = new InMemoryProfileRepository(profile);
  const routineRepository = new InMemoryRoutineRepository(routines);
  let n = 0;
  const adoptTemplate = new AdoptTemplate(
    new InMemoryRoutineTemplateRepository([aRoutineTemplate()]),
    routineRepository,
    profiles,
    new InMemoryWorkoutRepository(inProgress),
    () => `new-${++n}`,
  );
  return { adoptTemplate, profiles, routines: routineRepository };
}

describe('AdoptTemplate', () => {
  it('RF-RUT-02.AC1: copies the template for the profile goal and makes it the active routine', async () => {
    const { adoptTemplate, profiles, routines } = setup({ routines: [] });

    await expect(adoptTemplate.execute('PLT-FB3')).resolves.toEqual({ status: 'done' });

    const [copy] = routines.routines;
    expect(copy).toMatchObject({ id: 'new-1', sourceTemplateId: 'PLT-FB3' });
    expect(copy.days[0].exercises[0].prescription.repRange).toEqual({ min: 4, max: 6 });
    expect(profiles.profile?.activeRoutineId).toBe('new-1');
  });

  it('RF-RUT-02.AC2: the routine that was active stays in Mis rutinas', async () => {
    const { adoptTemplate, routines } = setup({
      profile: { ...defaultProfile(), activeRoutineId: 'mine' },
    });

    await adoptTemplate.execute('PLT-FB3');

    expect(routines.routines.map((r) => r.id)).toEqual(['mine', 'new-1']);
  });

  it('RF-RUT-02.AC4: with a workout in progress nothing changes (RN-RUT-09, D14)', async () => {
    const { adoptTemplate, profiles, routines } = setup({
      profile: { ...defaultProfile(), activeRoutineId: 'mine' },
      inProgress: aWorkout({ status: 'in_progress', finishedAt: null }),
    });

    await expect(adoptTemplate.execute('PLT-FB3')).resolves.toEqual({
      status: 'workoutInProgress',
    });

    expect(routines.routines).toHaveLength(1);
    expect(profiles.profile?.activeRoutineId).toBe('mine');
  });

  it('before the onboarding: creates the guest profile with the defaults (RN-PERF-02)', async () => {
    const { adoptTemplate, profiles } = setup({ profile: null });

    await adoptTemplate.execute('PLT-FB3');

    expect(profiles.profile).toEqual({ ...defaultProfile(), activeRoutineId: 'new-1' });
  });

  it('rejects a template that is not in the catalog', async () => {
    const { adoptTemplate } = setup();

    await expect(adoptTemplate.execute('PLT-XX')).rejects.toThrow('PLT-XX');
  });
});
