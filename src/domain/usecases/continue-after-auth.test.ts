import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { ContinueAfterAuth } from '@/domain/usecases/continue-after-auth';
import type { Observer } from '@/domain/repositories/observer';
import type { LocalSyncState } from '@/domain/repositories/sync-state-repository';
import { InMemoryProfileRepository } from '@/domain/testing/in-memory-repositories';

function setup(profile = defaultProfile(), restoreCompleted = true) {
  const profiles = new InMemoryProfileRepository(profile);
  const steps: unknown[] = [];
  const onboarding = { saveStep: async (step: unknown) => void steps.push(step) };
  const syncState = {
    observe: (observer: Observer<LocalSyncState>) => (
      observer.next({
        owner: 'guest',
        pending: 0,
        conflicts: 0,
        lastSyncedAt: null,
        restoreCompleted,
      }),
      () => {}
    ),
  };
  return {
    profiles,
    steps,
    continueAfterAuth: new ContinueAfterAuth(profiles, onboarding, syncState),
  };
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

  it('07 §4.2: while the account is being restored it waits, so its own profile is not overwritten', async () => {
    const { profiles, steps, continueAfterAuth } = setup(defaultProfile(), false);
    profiles.profile = null;

    await continueAfterAuth.execute();

    expect(profiles.profile).toBeNull();
    expect(steps).toEqual([]);
  });

  it('RF-SYNC-03.AC2: after a cut restoration, «Continuar» goes on to the onboarding', async () => {
    const { profiles, steps, continueAfterAuth } = setup(defaultProfile(), false);
    profiles.profile = null;

    await continueAfterAuth.execute({ evenIfRestoring: true });

    expect(profiles.profile).toEqual(defaultProfile());
    expect(steps).toEqual(['level']);
  });
});
