import type { Profile } from '@/domain/models/profile';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutine } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
} from '@/domain/testing/in-memory-repositories';
import { UpdateProfile } from '@/domain/usecases/update-profile';

const WITH_ROUTINE: Profile = { ...defaultProfile(), activeRoutineId: 'routine-1' };

function setUp(profile: Profile = WITH_ROUTINE) {
  const profiles = new InMemoryProfileRepository(profile);
  const routines = new InMemoryRoutineRepository([aRoutine()]);
  return { profiles, routines, update: new UpdateProfile(profiles, routines) };
}

describe('UpdateProfile', () => {
  it('RF-PERF-03.AC1: saves the change at once', async () => {
    const { update, profiles } = setUp();

    await update.execute({ goal: 'strength' });

    expect(profiles.profile?.goal).toBe('strength');
  });

  it('RF-PERF-03.AC2: a new goal or level with an active routine offers D06', async () => {
    const { update } = setUp();

    expect(await update.execute({ goal: 'strength' })).toEqual({ offerAdjust: true });
    expect(await update.execute({ level: 'advanced' })).toEqual({ offerAdjust: true });
  });

  it('no D06 for the same goal, for the other settings, or without an active routine', async () => {
    const { update } = setUp();

    expect(await update.execute({ goal: 'health' })).toEqual({ offerAdjust: false });
    expect(await update.execute({ daysPerWeek: 4 })).toEqual({ offerAdjust: false });
    expect(await setUp(defaultProfile()).update.execute({ goal: 'strength' })).toEqual({
      offerAdjust: false,
    });
  });

  it('RF-PERF-03.AC3: days out of 2 to 6 are not saved', async () => {
    const { update, profiles } = setUp();

    await expect(update.execute({ daysPerWeek: 7 })).rejects.toThrow();
    expect(profiles.profile?.daysPerWeek).toBe(3);
  });

  it('RF-PERF-04.AC2: changing the unit only changes the unit', async () => {
    const { update, profiles } = setUp();

    await update.execute({ unit: 'lb' });

    expect(profiles.profile).toEqual({ ...WITH_ROUTINE, unit: 'lb' });
  });
});
