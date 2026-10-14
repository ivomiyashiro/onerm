import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Workout } from '@/domain/models/workout';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import {
  aBilateralSet,
  anExercise,
  aRoutine,
  aWorkout,
  aWorkoutExercise,
} from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { ExerciseProgressScreen } from '@/presentation/features/progress/exercise-progress-screen';
import { progress } from '@/presentation/strings/progress';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};
const text = progress.exercise;
const PRESS = anExercise({ id: 'press', name: 'Press de pecho' });

const on = (date: string, loadKg: number) =>
  aWorkout({
    id: date,
    startedAt: new Date(`${date}T11:00:00Z`),
    finishedAt: new Date(`${date}T12:00:00Z`),
    exercises: [
      aWorkoutExercise({
        id: `${date}-we`,
        exerciseId: 'press',
        plannedExerciseId: 'press',
        status: 'done',
        sets: [aBilateralSet({ id: `${date}-s`, loadKg, reps: 8, rir: 2 })],
      }),
    ],
  });

async function renderScreen(finished: Workout[]) {
  const onClose = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider
        useCases={someUseCases(
          routineUseCasesOver({
            routines: new InMemoryRoutineRepository([aRoutine()]),
            templates: new InMemoryRoutineTemplateRepository(),
            profiles: new InMemoryProfileRepository(defaultProfile()),
            workouts: new InMemoryWorkoutRepository(null, finished),
            exercises: [PRESS],
            now: () => new Date('2026-10-14T12:00:00Z'),
          }),
        )}
      >
        <ExerciseProgressScreen exerciseId="press" onClose={onClose} />
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
  return { onClose, user: userEvent.setup() };
}

describe('ExerciseProgressScreen (S20)', () => {
  it('RF-PROG-04.AC1, RF-PROG-05.AC1: the records, the chart with its legend and the best sets', async () => {
    await renderScreen([on('2026-09-20', 60), on('2026-10-10', 62.5)]);

    expect(screen.getByRole('header', { name: 'Press de pecho' })).toBeOnTheScreen();
    expect(screen.getByText(text.heaviestLoad)).toBeOnTheScreen();
    expect(screen.getByRole('image', { name: 'Máximo estimado en kg' })).toBeOnTheScreen();
    expect(screen.getByText(text.recordLegend)).toBeOnTheScreen();
    expect(screen.getByText(text.bestSetPerWorkout)).toBeOnTheScreen();
  });

  it('RF-PROG-04.AC4: with one point, «¡Buen comienzo!»; «Todo» is another period', async () => {
    const { user } = await renderScreen([on('2026-10-10', 62.5)]);

    expect(screen.getByText(text.onePoint.title)).toBeOnTheScreen();
    await user.press(screen.getByRole('radio', { name: text.periods.all }));

    expect(screen.getByRole('radio', { name: text.periods.all, checked: true })).toBeOnTheScreen();
  });

  it('nothing to show goes back', async () => {
    const { onClose } = await renderScreen([]);

    expect(onClose).toHaveBeenCalled();
  });
});
