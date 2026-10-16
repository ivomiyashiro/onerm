import type { Profile } from '@/domain/models/profile';
import type { Observer } from '@/domain/repositories/observer';
import type { LocalSyncState } from '@/domain/repositories/sync-state-repository';
import {
  InMemoryOnboardingRepository,
  InMemoryProfileRepository,
} from '@/domain/testing/in-memory-repositories';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { AnswerOnboarding } from '@/domain/usecases/answer-onboarding';
import { ObserveEntry, type Entry } from '@/domain/usecases/observe-entry';
import { StartAsGuest } from '@/domain/usecases/start-as-guest';

const ONBOARDED: Profile = { ...defaultProfile(), onboardingCompletedAt: new Date(0) };

function setUp(
  profile: Profile | null = null,
  step: InMemoryOnboardingRepository['step'] = null,
  owner: 'guest' | 'user' = 'guest',
) {
  const profiles = new InMemoryProfileRepository(profile);
  const onboarding = new InMemoryOnboardingRepository(step);
  const entries: Entry[] = [];
  const error = jest.fn();
  const syncState = {
    observe: (observer: Observer<LocalSyncState>) => (
      observer.next({
        owner,
        pending: 0,
        conflicts: 0,
        lastSyncedAt: null,
        restoreCompleted: false,
      }),
      () => {}
    ),
  };
  new ObserveEntry(profiles, onboarding, syncState).execute({
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

describe('ObserveEntry (08 §3)', () => {
  it('RF-SYNC-03.AC1: an account device without its profile yet: S23', () => {
    const { entry } = setUp(null, null, 'user');

    expect(entry()).toEqual({ kind: 'restoring' });
  });

  it('RF-SYNC-03: once the account profile arrives the app opens, while the rest downloads', () => {
    const { entry } = setUp(ONBOARDED, null, 'user');

    expect(entry()).toEqual({ kind: 'app' });
  });

  it('without a local profile: the welcome (S01)', () => {
    expect(setUp().entry()).toEqual({ kind: 'welcome' });
  });

  it('RF-PERF-01.AC6: with the onboarding pending, its saved step', () => {
    expect(setUp(defaultProfile(), 'days').entry()).toMatchObject({
      kind: 'onboarding',
      step: 'days',
    });
  });

  it('RF-PERF-01.AC3: with the onboarding pending, the answers so far', () => {
    const answered = { ...defaultProfile(), level: 'advanced' as const, goal: 'strength' as const };

    expect(setUp(answered, 'days').entry()).toMatchObject({
      answers: { level: 'advanced', goal: 'strength', daysPerWeek: 3 },
    });
  });

  it('with the onboarding pending and no step saved: the first question', () => {
    expect(setUp(defaultProfile()).entry()).toMatchObject({ kind: 'onboarding', step: 'level' });
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
