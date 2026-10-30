import { act, render, screen, userEvent } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Workout } from '@/domain/models/workout';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aBilateralSet, aRoutine, aWorkout, aWorkoutExercise } from '@/domain/testing/builders';
import {
  FixedSyncStateRepository,
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { ObserveHistory } from '@/domain/usecases/observe-history';
import { HistoryScreen } from '@/presentation/features/progress/history-screen';
import { common } from '@/presentation/strings/common';
import { dialogs } from '@/presentation/strings/dialogs';
import { principles } from '@/presentation/strings/principles';
import { progress as text } from '@/presentation/strings/progress';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider, type UseCases } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useIsFocused: () => true,
}));

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

    expect(screen.getAllByTestId('history-skeleton', { includeHiddenElements: true })).toHaveLength(
      4,
    );
  });

  it('RF-PROG-01.AC1: the workouts by month, with records; one opens its detail', async () => {
    const { user, onOpenWorkout } = await renderScreen([on('w1', 28, 100), on('w2', 30, 105)]);

    expect(screen.getByText('septiembre 2026')).toBeOnTheScreen();
    expect(screen.getAllByText('52 min · 1 serie')).toHaveLength(2);
    expect(screen.getByText(text.overview.records(2))).toBeOnTheScreen();
    await user.press(screen.getAllByRole('button', { name: 'Día A · Cuerpo completo' })[0]);

    expect(onOpenWorkout).toHaveBeenCalledWith('w2');
  });

  it('RF-PROG-01.AC2: a workout not backed up yet says «Pendiente»', async () => {
    const workouts = new InMemoryWorkoutRepository(null, [on('w1', 28, 100), on('w2', 30, 105)]);
    const syncState = new FixedSyncStateRepository();
    syncState.setPendingWorkouts(['w1']);
    await renderScreen(
      [],
      someUseCases({ observeHistory: new ObserveHistory(workouts, syncState) }),
    );

    expect(screen.getAllByText(text.overview.pending)).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: `Día A · Cuerpo completo, ${text.overview.pending}` }),
    ).toBeOnTheScreen();
  });

  it('RF-PROG-01.AC3: empty, with «Empezar el próximo»', async () => {
    const { user, onStartNext } = await renderScreen([]);

    expect(screen.getByText(text.overview.empty.title)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: text.overview.empty.action }));

    expect(onStartNext).toHaveBeenCalled();
  });

  it('RF-PROG-06.AC1: «Volumen» shows this week per muscle and «¿Por qué 10 series?»', async () => {
    const { user } = await renderScreen([on('w1', 28, 100)]);

    await user.press(screen.getByRole('tab', { name: text.overview.volume }));
    expect(screen.getByText(text.overview.thisWeek)).toBeOnTheScreen();
    expect(screen.getByText('Pecho')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: text.overview.why10 }));

    expect(screen.getByText(principles['P-03'])).toBeOnTheScreen();
  });

  it('RF-PROG-03.AC4 from S18: swiping a workout deletes it after D16', async () => {
    const { user } = await renderScreen([on('w1', 28, 100), on('w2', 30, 105)]);

    await act(() =>
      fireGestureHandler(getByGestureTestId('swipe w2'), [
        { state: State.BEGAN, translationX: 0 },
        { state: State.ACTIVE, translationX: -100 },
        { state: State.END, translationX: -300 },
      ]),
    );
    await user.press(screen.getByRole('button', { name: common.swipe.delete }));
    expect(screen.getByText(dialogs.D16.body('workout', 1))).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: dialogs.D16.deleteDestructive }));

    expect(screen.getAllByRole('button', { name: 'Día A · Cuerpo completo' })).toHaveLength(1);
  });
});
