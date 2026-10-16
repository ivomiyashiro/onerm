import type { Profile } from '@/domain/models/profile';
import {
  InMemoryOnboardingRepository,
  InMemoryProfileRepository,
  FixedSyncStateRepository,
} from '@/domain/testing/in-memory-repositories';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { AnswerOnboarding } from '@/domain/usecases/answer-onboarding';
import { ObserveEntry, type Entry } from '@/domain/usecases/observe-entry';
import { StartAsGuest } from '@/domain/usecases/start-as-guest';

function setUp(profile: Profile | null = null, step: InMemoryOnboardingRepository['step'] = null) {
  const profiles = new InMemoryProfileRepository(profile);
  const onboarding = new InMemoryOnboardingRepository(step);
  const entries: Entry[] = [];
  const error = jest.fn();
  new ObserveEntry(profiles, onboarding, new FixedSyncStateRepository()).execute({
    next: (e) => entries.push(e),
    error,
  });
  return {
    profiles,
    onboarding,
    error,
    entry: () => entries[entries.length - 1],
    startAsGuest: new StartAsGuest(profiles, onboarding),
    answer: new AnswerOnboarding(profiles, onboarding),
  };
}

describe('StartAsGuest (RF-AUTH-01.AC1)', () => {
  it('creates the guest profile with the defaults and opens the first question', async () => {
    const { startAsGuest, profiles, entry } = setUp();

    await startAsGuest.execute();

    expect(profiles.profile).toEqual(defaultProfile());
    expect(entry()).toMatchObject({ kind: 'onboarding', step: 'level' });
  });

  it('keeps a profile that already exists', async () => {
    const { startAsGuest, profiles } = setUp({ ...defaultProfile(), daysPerWeek: 5 });

    await startAsGuest.execute();

    expect(profiles.profile?.daysPerWeek).toBe(5);
  });
});
