import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Workout } from '@/domain/models/workout';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aBilateralSet, aRoutine, aWorkout, aWorkoutExercise } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { HistoryScreen } from '@/presentation/features/progress/history-screen';
import { progress as text } from '@/presentation/strings/progress';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider, type UseCases } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};

const on = (id: string, day: number, loadKg: number) =>
  aWorkout({
    id,
    routineNameSnapshot: 'Cuerpo completo',
    dayNameSnapshot: 'Día A',
    startedAt: new Date(2026, 8, day, 18),
    finishedAt: new Date(2026, 8, day, 18, 52),
    exercises: [
      aWorkoutExercise({
        id: `${id}-we`,
        workoutId: id,
        status: 'done',
        sets: [aBilateralSet({ id: `${id}-s`, workoutExerciseId: `${id}-we`, loadKg })],
      }),
    ],
  });

async function renderScreen(finished: Workout[], useCases?: UseCases) {
  const onOpenWorkout = jest.fn();
  const onStartNext = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider
        useCases={
          useCases ??
          someUseCases(
            routineUseCasesOver({
              routines: new InMemoryRoutineRepository([aRoutine()]),
              templates: new InMemoryRoutineTemplateRepository(),
              profiles: new InMemoryProfileRepository(defaultProfile()),
              workouts: new InMemoryWorkoutRepository(null, finished),
            }),
          )
        }
      >
        <HistoryScreen onOpenWorkout={onOpenWorkout} onStartNext={onStartNext} />
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
  return { onOpenWorkout, onStartNext, user: userEvent.setup() };
}

describe('HistoryScreen (S18)', () => {
  it('loading: skeleton rows', async () => {
    await renderScreen([], someUseCases());

    expect(
      screen.getAllByTestId('history-skeleton', { includeHiddenElements: true }),
    ).toHaveLength(4);
  });

  it('RF-PROG-01.AC1: the workouts by month, with records; one opens its detail', async () => {
    const { user, onOpenWorkout } = await renderScreen([on('w1', 28, 100), on('w2', 30, 105)]);

    expect(screen.getByText('septiembre 2026')).toBeOnTheScreen();
    expect(screen.getAllByText('52 min · 1 serie')).toHaveLength(2);
    expect(screen.getByText(text.overview.records(2))).toBeOnTheScreen();
    await user.press(screen.getAllByRole('button', { name: 'Día A · Cuerpo completo' })[0]);

    expect(onOpenWorkout).toHaveBeenCalledWith('w2');
  });

  it('RF-PROG-01.AC3: empty, with «Empezar el próximo»', async () => {
    const { user, onStartNext } = await renderScreen([]);

    expect(screen.getByText(text.overview.empty.title)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: text.overview.empty.action }));

    expect(onStartNext).toHaveBeenCalled();
  });
});
