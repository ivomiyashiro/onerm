import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { ContinueAfterAuth } from '@/domain/usecases/continue-after-auth';
import { InMemoryProfileRepository } from '@/domain/testing/in-memory-repositories';

function setup(profile = defaultProfile()) {
  const profiles = new InMemoryProfileRepository(profile);
  const steps: unknown[] = [];
  const onboarding = { saveStep: async (step: unknown) => void steps.push(step) };
  return { profiles, steps, continueAfterAuth: new ContinueAfterAuth(profiles, onboarding) };
}

describe('ContinueAfterAuth (RF-AUTH-02.AC1, RF-AUTH-03.AC1)', () => {
  it('a device without a profile starts the onboarding, like the guest does', async () => {
    const { profiles, steps, continueAfterAuth } = setup();
    profiles.profile = null;

    await continueAfterAuth.execute();

    expect(profiles.profile).toEqual(defaultProfile());
    expect(steps).toEqual(['level']);
  });

  it('a device that already has its profile is left as it is', async () => {
    const { steps, continueAfterAuth } = setup();

    await continueAfterAuth.execute();

    expect(steps).toEqual([]);
  });
});
