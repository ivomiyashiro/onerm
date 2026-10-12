import { defaultProfile } from '@/domain/rules/routine/default-profile';

describe('defaultProfile', () => {
  it('RN-PERF-02: novice, general health and 3 days, with the onboarding still pending', () => {
    const profile = defaultProfile();

    expect(profile).toMatchObject({
      level: 'novice',
      goal: 'health',
      daysPerWeek: 3,
      activeRoutineId: null,
      onboardingCompletedAt: null,
    });
  });

  it('RN-AUTH-06: the guest profile uses the fixed id «guest»', () => {
    expect(defaultProfile().id).toBe('guest');
  });

  it('RN-PERF-04: a novice starts with the simple effort scale, not chosen by hand', () => {
    expect(defaultProfile()).toMatchObject({ effortMode: 'simple', effortModeExplicit: false });
  });

  it('RN-PERF-06 and RN-PERF-08: the default increments and bar weight, per unit', () => {
    expect(defaultProfile()).toMatchObject({
      unit: 'kg',
      loadIncrementsKg: { barbell: 2.5, dumbbell: 2, cable: 2.5, machine: 5, kettlebell: 4 },
      loadIncrementsLb: { barbell: 5, dumbbell: 5, cable: 5, machine: 10, kettlebell: 10 },
      barWeightKg: 20,
      barWeightLb: 45,
    });
  });
});
