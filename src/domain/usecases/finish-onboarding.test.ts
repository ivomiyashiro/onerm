import { defaultProfile } from '@/domain/rules/routine/default-profile';
import {
  InMemoryOnboardingRepository,
  InMemoryProfileRepository,
} from '@/domain/testing/in-memory-repositories';
import { FinishOnboarding } from '@/domain/usecases/finish-onboarding';

const NOW = new Date(1_780_000_000_000);

describe('FinishOnboarding', () => {
  it('RF-PERF-02: marks the onboarding as done and forgets the step', async () => {
    const profiles = new InMemoryProfileRepository({ ...defaultProfile(), activeRoutineId: 'r1' });
    const onboarding = new InMemoryOnboardingRepository('recommendation');

    await new FinishOnboarding(profiles, onboarding, () => NOW).execute();

    expect(profiles.profile).toMatchObject({ onboardingCompletedAt: NOW, activeRoutineId: 'r1' });
    expect(onboarding.step).toBeNull();
  });
});
