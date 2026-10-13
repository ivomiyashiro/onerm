import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { OnboardingStep } from '@/domain/models/onboarding';
import type { Profile } from '@/domain/models/profile';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import {
  InMemoryOnboardingRepository,
  InMemoryProfileRepository,
} from '@/domain/testing/in-memory-repositories';
import { AnswerOnboarding } from '@/domain/usecases/answer-onboarding';
import { ObserveEntry } from '@/domain/usecases/observe-entry';
import { useOnboardingViewModel } from '@/presentation/features/onboarding/use-onboarding-view-model';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

async function renderViewModel(
  profile: Profile = defaultProfile(),
  step: OnboardingStep = 'level',
) {
  const profiles = new InMemoryProfileRepository(profile);
  const onboarding = new InMemoryOnboardingRepository(step);
  const useCases = someUseCases({
    observeEntry: new ObserveEntry(profiles, onboarding),
    answerOnboarding: new AnswerOnboarding(profiles, onboarding),
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <UseCasesProvider useCases={useCases}>{children}</UseCasesProvider>
  );
  const hook = await renderHook(() => useOnboardingViewModel(), { wrapper });
  return { ...hook, profiles, onboarding };
}

describe('useOnboardingViewModel', () => {
  it('is loading until the saved progress arrives', async () => {
    const { result } = await renderHook(() => useOnboardingViewModel(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <UseCasesProvider useCases={someUseCases()}>{children}</UseCasesProvider>
      ),
    });

    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('starts on the first question with the defaults chosen (RN-PERF-02)', async () => {
    const { result } = await renderViewModel();

    expect(result.current.state).toEqual({
      status: 'content',
      step: 'level',
      answers: { level: 'novice', goal: 'health', daysPerWeek: 3 },
    });
  });

  it('RF-PERF-01.AC1 and AC6: «Siguiente» saves the answer and the next step', async () => {
    const { result, profiles, onboarding } = await renderViewModel();

    await act(() => result.current.actions.select({ level: 'intermediate' }));
    await act(() => result.current.actions.next());

    expect(profiles.profile?.level).toBe('intermediate');
    expect(onboarding.step).toBe('goal');
    expect(result.current.state).toMatchObject({ step: 'goal' });
  });

  it('RF-PERF-01.AC6: resumes on the saved step', async () => {
    const { result } = await renderViewModel(defaultProfile(), 'days');

    expect(result.current.state).toMatchObject({ step: 'days' });
  });

  it('RF-PERF-01.AC3: «Atrás» shows the previous question with its answer', async () => {
    const answered = { ...defaultProfile(), goal: 'strength' as const };
    const { result } = await renderViewModel(answered, 'days');

    await act(() => result.current.actions.back());

    expect(result.current.state).toMatchObject({ step: 'goal', answers: { goal: 'strength' } });
  });

  it('the last question goes to the recommendation', async () => {
    const { result, profiles, onboarding } = await renderViewModel(defaultProfile(), 'days');

    await act(() => result.current.actions.select({ daysPerWeek: 5 }));
    await act(() => result.current.actions.next());

    expect(profiles.profile?.daysPerWeek).toBe(5);
    expect(onboarding.step).toBe('recommendation');
  });

  it('RF-PERF-01.AC4: «Saltear» keeps what was answered, not the unconfirmed choice', async () => {
    const answered = { ...defaultProfile(), level: 'advanced' as const };
    const { result, profiles, onboarding } = await renderViewModel(answered, 'goal');

    await act(() => result.current.actions.select({ goal: 'strength' }));
    await act(() => result.current.actions.skip());

    expect(profiles.profile).toEqual(answered);
    expect(onboarding.step).toBe('recommendation');
  });
});
