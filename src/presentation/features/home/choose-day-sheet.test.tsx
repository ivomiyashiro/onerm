import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutine, aRoutineDay, aWorkout, anExercise } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { ChooseDaySheet } from '@/presentation/features/home/choose-day-sheet';
import { home } from '@/presentation/strings/home';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};

const ROUTINE = aRoutine({
  name: 'Cuerpo completo A/B',
  days: [
    aRoutineDay({ id: 'A', name: 'Día A' }),
    aRoutineDay({ id: 'B', name: 'Día B', position: 1 }),
  ],
});

async function renderSheet() {
  let n = 0;
  const workouts = new InMemoryWorkoutRepository(null, [
    aWorkout({ routineDayId: 'A', finishedAt: new Date('2026-10-05T12:00:00Z') }),
  ]);
  const callbacks = { onClose: jest.fn(), onStarted: jest.fn() };
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider
        useCases={someUseCases(
          routineUseCasesOver({
            routines: new InMemoryRoutineRepository([ROUTINE]),
            templates: new InMemoryRoutineTemplateRepository(),
            profiles: new InMemoryProfileRepository({
              ...defaultProfile(),
              activeRoutineId: 'routine-1',
            }),
            workouts,
            exercises: [anExercise({ name: 'Sentadilla' })],
            newId: () => `id-${++n}`,
            now: () => new Date('2026-10-09T12:00:00Z'),
          }),
        )}
      >
        <ChooseDaySheet {...callbacks} />
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
  return { ...callbacks, workouts, user: userEvent.setup() };
}

describe('ChooseDaySheet (S08)', () => {
  it('RF-ENT-01.AC3: every day with when it was done, and the next one recommended', async () => {
    await renderSheet();

    expect(screen.getByRole('radio', { name: 'Día A' })).not.toBeChecked();
    expect(screen.getByText(home.chooseDay.doneDaysAgo(4))).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Día B' })).toBeChecked();
    expect(screen.getByText(home.chooseDay.neverDone)).toBeOnTheScreen();
    expect(screen.getByText(home.chooseDay.recommended)).toBeOnTheScreen();
  });

  it('RF-ENT-01.AC3: any day can be started', async () => {
    const { user, workouts, onStarted } = await renderSheet();

    await user.press(screen.getByRole('radio', { name: 'Día A' }));
    await user.press(screen.getByRole('button', { name: home.chooseDay.choose('Día A') }));

    expect(workouts.inProgress?.routineDayId).toBe('A');
    expect(onStarted).toHaveBeenCalled();
  });
});
