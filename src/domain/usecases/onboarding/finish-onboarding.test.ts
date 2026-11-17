import { defaultProfile } from '@/domain/rules/routine/default-profile';
import {
  FixedSyncStateRepository,
  InMemoryOnboardingRepository,
  InMemoryProfileRepository,
} from '@/domain/testing/in-memory-repositories';
import { firstValue } from '@/domain/testing/first-value';
import { FinishOnboarding } from '@/domain/usecases/onboarding/finish-onboarding';
import { ObserveEntry, type Entry } from '@/domain/usecases/startup/observe-entry';

const NOW = new Date(1_780_000_000_000);

describe('FinishOnboarding', () => {
  it('RF-PERF-02: marks the onboarding as done and forgets the step', async () => {
    const profiles = new InMemoryProfileRepository({ ...defaultProfile(), activeRoutineId: 'r1' });
    const onboarding = new InMemoryOnboardingRepository('recommendation');

    await new FinishOnboarding(profiles, onboarding, () => NOW).execute();

    expect(profiles.profile).toMatchObject({ onboardingCompletedAt: NOW, activeRoutineId: 'r1' });
    expect(onboarding.step).toBeNull();
  });

  it('keeps the date of an onboarding already done (S06 opened again by a link)', async () => {
    const before = new Date(0);
    const profiles = new InMemoryProfileRepository({
      ...defaultProfile(),
      onboardingCompletedAt: before,
    });

    await new FinishOnboarding(profiles, new InMemoryOnboardingRepository(), () => NOW).execute();

    expect(profiles.profile?.onboardingCompletedAt).toBe(before);
  });
});

describe('FinishOnboarding: write order (spike #342, inventario: FinishOnboarding; ADR-0013)', () => {
  it('if clearing the step fails, the onboarding is done and the app opens', async () => {
    const profiles = new InMemoryProfileRepository({ ...defaultProfile(), activeRoutineId: 'r1' });
    const onboarding = new InMemoryOnboardingRepository('recommendation');
    jest.spyOn(onboarding, 'saveStep').mockRejectedValue(new Error('disk full'));

    await expect(new FinishOnboarding(profiles, onboarding, () => NOW).execute()).rejects.toThrow(
      'disk full',
    );

    expect(profiles.profile?.onboardingCompletedAt).toEqual(NOW);
    const entry = await firstValue<Entry>((o) =>
      new ObserveEntry(profiles, onboarding, new FixedSyncStateRepository()).execute(o),
    );
    expect(entry).toMatchObject({ kind: 'app' });
  });
});
