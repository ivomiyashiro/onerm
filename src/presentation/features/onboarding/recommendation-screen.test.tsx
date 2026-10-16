import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Profile } from '@/domain/models/profile';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutineTemplate } from '@/domain/testing/builders';
import {
  InMemoryOnboardingRepository,
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
  FixedSyncStateRepository,
} from '@/domain/testing/in-memory-repositories';
import { FinishOnboarding } from '@/domain/usecases/finish-onboarding';
import { ObserveEntry } from '@/domain/usecases/observe-entry';
import { ObserveRecommendation } from '@/domain/usecases/observe-recommendation';
import { RecommendationScreen } from '@/presentation/features/onboarding/recommendation-screen';
import { onboarding } from '@/presentation/strings/onboarding';
import { routines } from '@/presentation/strings/routines';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};
const TEMPLATES = [
  aRoutineTemplate({ id: 'PLT-FB3', name: 'Cuerpo completo A/B', daysPerWeek: 3 }),
  aRoutineTemplate({ id: 'PLT-TP4', name: 'Torso / Pierna', daysPerWeek: 4 }),
];

async function renderScreen(profile: Profile = defaultProfile()) {
  const repositories = {
    routines: new InMemoryRoutineRepository(),
    templates: new InMemoryRoutineTemplateRepository(TEMPLATES),
    profiles: new InMemoryProfileRepository(profile),
    workouts: new InMemoryWorkoutRepository(null),
  };
  const { profiles, templates } = repositories;
  const onboardingSteps = new InMemoryOnboardingRepository('recommendation');
  const useCases = someUseCases({
    ...routineUseCasesOver({ ...repositories, newId: () => 'r1' }),
    observeEntry: new ObserveEntry(profiles, onboardingSteps, new FixedSyncStateRepository()),
    observeRecommendation: new ObserveRecommendation(templates, profiles),
    finishOnboarding: new FinishOnboarding(profiles, onboardingSteps, () => new Date(0)),
  });
  const onDone = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider useCases={useCases}>
        <RecommendationScreen onDone={onDone} />
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
  return { onDone, profiles };
}

describe('RecommendationScreen (S06)', () => {
  it('RF-PERF-02.AC1: the recommended template, its summary and «¿Por qué?»', async () => {
    await renderScreen();

    expect(screen.getByRole('header', { name: 'Cuerpo completo A/B' })).toBeOnTheScreen();
    expect(screen.getByText(routines.template.summary['PLT-FB3'])).toBeOnTheScreen();
    await userEvent.press(screen.getByRole('button', { name: onboarding.recommendation.why }));
    expect(screen.getByText(routines.template.rationale['PLT-FB3'])).toBeOnTheScreen();
  });

  it('RF-PERF-02.AC4: a novice with 5 days sees «Con 3 días alcanza…»', async () => {
    await renderScreen({ ...defaultProfile(), daysPerWeek: 5 });

    expect(screen.getByText(onboarding.recommendation.noviceManyDays)).toBeOnTheScreen();
  });

  it('intermediate with 5 days: the 4-day template and its note', async () => {
    await renderScreen({ ...defaultProfile(), level: 'intermediate', daysPerWeek: 5 });

    expect(screen.getByRole('header', { name: 'Torso / Pierna' })).toBeOnTheScreen();
    expect(screen.getByText(onboarding.recommendation.intermediateManyDays)).toBeOnTheScreen();
  });

  it('RF-PERF-02.AC6: the strength goal shows the «sin barra» notice', async () => {
    await renderScreen({ ...defaultProfile(), goal: 'strength' });

    expect(screen.getByText(routines.template.strengthWarning)).toBeOnTheScreen();
  });

  it('RF-PERF-02.AC2: «Empezar con esta rutina» adopts it and goes home', async () => {
    const { onDone, profiles } = await renderScreen();

    await userEvent.press(screen.getByRole('button', { name: onboarding.recommendation.start }));

    expect(profiles.profile?.activeRoutineId).toBe('r1');
    expect(onDone).toHaveBeenCalledWith('home');
  });

  it('RF-PERF-02.AC3: «Ver otras rutinas» opens the templates', async () => {
    const { onDone } = await renderScreen();

    await userEvent.press(
      screen.getByRole('button', { name: onboarding.recommendation.seeOthers }),
    );

    expect(onDone).toHaveBeenCalledWith('templates');
  });
});
