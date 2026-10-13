import type { Profile } from '@/domain/models/profile';
import {
  InMemoryOnboardingRepository,
  InMemoryProfileRepository,
} from '@/domain/testing/in-memory-repositories';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { AnswerOnboarding } from '@/domain/usecases/answer-onboarding';
import { ObserveEntry, type Entry } from '@/domain/usecases/observe-entry';
import { StartAsGuest } from '@/domain/usecases/start-as-guest';

const ONBOARDED: Profile = { ...defaultProfile(), onboardingCompletedAt: new Date(0) };

function setUp(profile: Profile | null = null, step: InMemoryOnboardingRepository['step'] = null) {
  const profiles = new InMemoryProfileRepository(profile);
  const onboarding = new InMemoryOnboardingRepository(step);
  const entries: Entry[] = [];
  const error = jest.fn();
  new ObserveEntry(profiles, onboarding).execute({ next: (e) => entries.push(e), error });
  return {
    profiles,
    onboarding,
    error,
    entry: () => entries[entries.length - 1],
    startAsGuest: new StartAsGuest(profiles, onboarding),
    answer: new AnswerOnboarding(profiles, onboarding),
  };
}

describe('ObserveEntry (08 §3)', () => {
  it('without a local profile: the welcome (S01)', () => {
    expect(setUp().entry()).toEqual({ kind: 'welcome' });
  });

  it('RF-PERF-01.AC6: with the onboarding pending, its saved step', () => {
    expect(setUp(defaultProfile(), 'days').entry()).toEqual({ kind: 'onboarding', step: 'days' });
  });

  it('with the onboarding pending and no step saved: the first question', () => {
    expect(setUp(defaultProfile()).entry()).toEqual({ kind: 'onboarding', step: 'level' });
  });

  it('with the onboarding done: the app, whatever step is left', () => {
    expect(setUp(ONBOARDED, 'goal').entry()).toEqual({ kind: 'app' });
  });

  it('a failed read is an error', () => {
    const { profiles, error } = setUp();

    profiles.fail();

    expect(error).toHaveBeenCalled();
  });
});
