import type { Profile } from '@/domain/models/profile';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { InMemoryProfileRepository } from '@/domain/testing/in-memory-repositories';
import { UpdateLoadSetting } from '@/domain/usecases/update-load-setting';

function setUp(profile: Profile = defaultProfile()) {
  const profiles = new InMemoryProfileRepository(profile);
  return { profiles, update: new UpdateLoadSetting(profiles) };
}

describe('UpdateLoadSetting (RF-PERF-06)', () => {
  it('AC2: sets the increment of an equipment, in the active unit', async () => {
    const { update, profiles } = setUp();

    await update.execute('dumbbell', 2.5);

    expect(profiles.profile?.loadIncrementsKg.dumbbell).toBe(2.5);
    expect(profiles.profile?.loadIncrementsLb.dumbbell).toBe(5);
  });

  it('AC3: in lb it writes the lb map and leaves the kg one as it was (RN-PERF-06)', async () => {
    const { update, profiles } = setUp({ ...defaultProfile(), unit: 'lb' });

    await update.execute('dumbbell', 10);

    expect(profiles.profile?.loadIncrementsLb.dumbbell).toBe(10);
    expect(profiles.profile?.loadIncrementsKg.dumbbell).toBe(2);
  });

  it('RN-PERF-08: the bar weight, per unit', async () => {
    const { update, profiles } = setUp();

    await update.execute('bar', 15);

    expect(profiles.profile).toMatchObject({ barWeightKg: 15, barWeightLb: 45 });
  });

  it('rejects 0 or less, more than 50 for an increment and more than 100 for the bar', async () => {
    const { update, profiles } = setUp();

    await expect(update.execute('machine', 0)).rejects.toThrow(RangeError);
    await expect(update.execute('machine', 51)).rejects.toThrow(RangeError);
    await expect(update.execute('bar', 101)).rejects.toThrow(RangeError);
    expect(profiles.profile).toEqual(defaultProfile());
  });
});
