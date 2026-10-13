import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Profile } from '@/domain/models/profile';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutineTemplate } from '@/domain/testing/builders';
import {
  InMemoryOnboardingRepository,
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { FinishOnboarding } from '@/domain/usecases/finish-onboarding';
import { ObserveEntry } from '@/domain/usecases/observe-entry';
import { ObserveRecommendation } from '@/domain/usecases/observe-recommendation';
import { useRecommendationViewModel } from '@/presentation/features/onboarding/use-recommendation-view-model';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

const NOW = new Date(1_780_000_000_000);

async function renderViewModel(profile: Profile = defaultProfile()) {
  const repositories = {
    routines: new InMemoryRoutineRepository(),
    templates: new InMemoryRoutineTemplateRepository([aRoutineTemplate()]),
    profiles: new InMemoryProfileRepository(profile),
    workouts: new InMemoryWorkoutRepository(null),
  };
  const onboarding = new InMemoryOnboardingRepository('recommendation');
  const { profiles, templates } = repositories;
  const useCases = someUseCases({
    ...routineUseCasesOver({ ...repositories, newId: () => 'new-routine' }),
    observeEntry: new ObserveEntry(profiles, onboarding),
    observeRecommendation: new ObserveRecommendation(templates, profiles),
    finishOnboarding: new FinishOnboarding(profiles, onboarding, () => NOW),
  });
  const onDone = jest.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <UseCasesProvider useCases={useCases}>{children}</UseCasesProvider>
  );
  const hook = await renderHook(() => useRecommendationViewModel(onDone), { wrapper });
  return { ...hook, ...repositories, onboarding, onDone };
}

describe('useRecommendationViewModel', () => {
  it('is loading until the recommendation arrives', async () => {
    const { result } = await renderHook(() => useRecommendationViewModel(jest.fn()), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <UseCasesProvider useCases={someUseCases()}>{children}</UseCasesProvider>
      ),
    });

    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('content: the recommended template', async () => {
    const { result } = await renderViewModel();

    expect(result.current.state).toMatchObject({
      status: 'content',
      recommendation: { template: { id: 'PLT-FB3' } },
    });
  });

  it('RF-PERF-02.AC2: «Empezar» adopts it as the active routine and goes home', async () => {
    const { result, profiles, routines, onDone } = await renderViewModel();

    await act(() => result.current.actions.start());

    expect(profiles.profile).toMatchObject({
      activeRoutineId: 'new-routine',
      onboardingCompletedAt: NOW,
    });
    expect(routines.routines).toHaveLength(1);
    expect(onDone).toHaveBeenCalledWith('home');
  });

  it('a retry after a failed finish does not adopt the template twice', async () => {
    const { result, routines, onboarding, onDone } = await renderViewModel();
    const saveStep = jest.spyOn(onboarding, 'saveStep').mockRejectedValueOnce(new Error('disk'));

    await act(() => result.current.actions.start());
    expect(onDone).not.toHaveBeenCalled();

    await act(() => result.current.actions.start());

    expect(routines.routines).toHaveLength(1);
    expect(onDone).toHaveBeenCalledWith('home');
    saveStep.mockRestore();
  });

  it('RF-PERF-02.AC3: «Ver otras rutinas» finishes and opens the templates', async () => {
    const { result, profiles, onDone } = await renderViewModel();

    await act(() => result.current.actions.seeOthers());

    expect(profiles.profile?.onboardingCompletedAt).toEqual(NOW);
    expect(onDone).toHaveBeenCalledWith('templates');
  });

  it('RF-PERF-02.AC5: «Ahora no» finishes without an active routine and goes home', async () => {
    const { result, profiles, onboarding, onDone } = await renderViewModel();

    await act(() => result.current.actions.notNow());

    expect(profiles.profile).toMatchObject({ activeRoutineId: null, onboardingCompletedAt: NOW });
    expect(onboarding.step).toBeNull();
    expect(onDone).toHaveBeenCalledWith('home');
  });

  it('error: a failed read, and retry reads again', async () => {
    const { result, profiles } = await renderViewModel();

    await act(() => profiles.fail());
    expect(result.current.state).toEqual({ status: 'error' });

    await act(() => result.current.actions.retry());
    expect(result.current.state.status).toBe('content');
  });
});
