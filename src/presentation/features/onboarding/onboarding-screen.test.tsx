import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { OnboardingStep } from '@/domain/models/onboarding';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import {
  InMemoryOnboardingRepository,
  InMemoryProfileRepository,
} from '@/domain/testing/in-memory-repositories';
import { AnswerOnboarding } from '@/domain/usecases/answer-onboarding';
import { ObserveEntry } from '@/domain/usecases/observe-entry';
import { OnboardingScreen } from '@/presentation/features/onboarding/onboarding-screen';
import { onboarding as strings } from '@/presentation/strings/onboarding';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};

async function renderScreen(step: OnboardingStep = 'level') {
  const profiles = new InMemoryProfileRepository(defaultProfile());
  const onboarding = new InMemoryOnboardingRepository(step);
  const useCases = someUseCases({
    observeEntry: new ObserveEntry(profiles, onboarding),
    answerOnboarding: new AnswerOnboarding(profiles, onboarding),
  });
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider useCases={useCases}>
        <OnboardingScreen />
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
  return { profiles, onboarding };
}

describe('OnboardingScreen (S05)', () => {
  it('step 1: the level, in plain words, with the default chosen (RF-PERF-01.AC5)', async () => {
    await renderScreen();

    expect(screen.getByText(strings.stepOf(1))).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: strings.level.question })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: strings.level.novice.title })).toBeChecked();
    expect(screen.getByText(strings.level.advanced.body)).toBeOnTheScreen();
    // The first question has nowhere to go back to.
    expect(screen.queryByRole('button', { name: strings.back })).not.toBeOnTheScreen();
  });

  it('choosing and «Siguiente» saves the answer and shows step 2', async () => {
    const { profiles } = await renderScreen();

    await userEvent.press(screen.getByRole('radio', { name: strings.level.advanced.title }));
    await userEvent.press(screen.getByRole('button', { name: strings.next }));

    expect(profiles.profile?.level).toBe('advanced');
    expect(screen.getByRole('header', { name: strings.goal.question })).toBeOnTheScreen();
  });

  it('step 3: the days from 2 to 6 and «Ver mi rutina»', async () => {
    const { onboarding } = await renderScreen('days');

    expect(screen.getByText(strings.days.help)).toBeOnTheScreen();
    await userEvent.press(screen.getByRole('radio', { name: '4' }));
    await userEvent.press(screen.getByRole('button', { name: strings.seeMyRoutine }));

    expect(onboarding.step).toBe('recommendation');
  });

  it('«Atrás» and «Saltear»', async () => {
    const { onboarding } = await renderScreen('goal');

    await userEvent.press(screen.getByRole('button', { name: strings.back }));
    expect(screen.getByRole('header', { name: strings.level.question })).toBeOnTheScreen();

    await userEvent.press(screen.getByRole('button', { name: strings.skip }));
    expect(onboarding.step).toBe('recommendation');
  });
});
