import type { Profile } from '@/domain/models/profile';
import {
  InMemoryOnboardingRepository,
  InMemoryProfileRepository,
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

describe('AnswerOnboarding', () => {
  it('RF-PERF-01.AC1 and AC6: saves the answer and the next step', async () => {
    const { answer, profiles, entry } = setUp(defaultProfile(), 'level');

    await answer.execute({ level: 'intermediate' }, 'goal');

    expect(profiles.profile).toMatchObject({ level: 'intermediate', effortMode: 'rir' });
    expect(entry()).toEqual({ kind: 'onboarding', step: 'goal' });
  });

  it('RF-PERF-01.AC4: skipping keeps what was answered and goes to the recommendation', async () => {
    const answered = { ...defaultProfile(), level: 'advanced' as const };
    const { answer, profiles, entry } = setUp(answered, 'goal');

    await answer.execute({}, 'recommendation');

    expect(profiles.profile).toEqual(answered);
    expect(entry()).toEqual({ kind: 'onboarding', step: 'recommendation' });
  });
});
