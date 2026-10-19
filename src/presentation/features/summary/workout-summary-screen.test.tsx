import { act, render, screen, userEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { AccessibilityInfo } from 'react-native';
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
import { WorkoutSummaryScreen } from '@/presentation/features/summary/workout-summary-screen';
import { dialogs } from '@/presentation/strings/dialogs';
import { home } from '@/presentation/strings/home';
import { workout as text } from '@/presentation/strings/workout';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => {}),
  NotificationFeedbackType: { Success: 'success' },
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};
const SQUAT = anExercise({ name: 'Sentadilla' });
const CURL = anExercise({ id: 'curl', name: 'Curl' });

function done(id: string, finishedAt: string, loadKg: number | null): Workout {
  return aWorkout({
    id,
    finishedAt: new Date(finishedAt),
    startedAt: new Date(new Date(finishedAt).getTime() - 52 * 60_000),
    exercises: [
      aWorkoutExercise({
        id: `${id}-we`,
        workoutId: id,
        status: 'done',
        sets: [aBilateralSet({ id: `${id}-s`, workoutExerciseId: `${id}-we`, loadKg, reps: 8 })],
      }),
      aWorkoutExercise({
        id: `${id}-curl`,
        workoutId: id,
        exerciseId: 'curl',
        plannedExerciseId: 'curl',
        position: 1,
        status: 'skipped',
      }),
    ],
  });
}

async function renderScreen(
  finished: Workout[],
  id = finished.at(-1)!.id,
  workouts = new InMemoryWorkoutRepository(null, finished),
) {
  const onDone = jest.fn();
  const onCreateAccount = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider
        useCases={someUseCases(
          routineUseCasesOver({
            routines: new InMemoryRoutineRepository([aRoutine()]),
            templates: new InMemoryRoutineTemplateRepository(),
            profiles: new InMemoryProfileRepository(defaultProfile()),
            workouts,
            exercises: [SQUAT, CURL],
          }),
        )}
      >
        <WorkoutSummaryScreen workoutId={id} onDone={onDone} onCreateAccount={onCreateAccount} />
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
  return { onDone, onCreateAccount, user: userEvent.setup() };
}

const { summary: strings } = text;

beforeEach(() => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.mocked(Haptics.notificationAsync).mockClear();
});

describe('WorkoutSummaryScreen (S12)', () => {
  it('RF-ENT-11.AC1, AC6: the total load first, then duration, sets, exercises and what was done', async () => {
    const { user, onDone } = await renderScreen([done('w1', '2026-10-13T19:00:00Z', 100)]);

    expect(screen.getByRole('header', { name: strings.finished })).toBeOnTheScreen();
    // RN-ENT-13: 100 kg × 8. Its accessible name is the final value while it counts.
    expect(
      screen.getByLabelText(strings.mainFigure(strings.totalLoad, '800 kg')),
    ).toBeOnTheScreen();
    expect(screen.getByText('52 min')).toBeOnTheScreen();
    expect(screen.getByText('1 de 2')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sentadilla, 1 serie · mejor 100 kg × 8')).toBeOnTheScreen();
    expect(screen.getByText('100 kg × 8')).toBeOnTheScreen();
    expect(screen.getByText(strings.skipped)).toBeOnTheScreen();
    expect(screen.getByText(strings.nextWorkout)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: strings.ready }));

    expect(onDone).toHaveBeenCalled();
  });

  it('without records it says what was added today (RN-PROG-03: the first time is none)', async () => {
    await renderScreen([done('w1', '2026-10-13T19:00:00Z', 100)]);

    expect(screen.queryByText(strings.todayRecords)).toBeNull();
    expect(screen.getByText(strings.noRecords(1))).toBeOnTheScreen();
  });

  it('RF-ENT-11.AC6: only bodyweight, the duration is the main figure', async () => {
    await renderScreen([done('w1', '2026-10-13T19:00:00Z', null)]);

    expect(screen.getByLabelText(strings.mainFigure(strings.duration, '52 min'))).toBeOnTheScreen();
    expect(screen.queryByText(strings.totalLoad)).toBeNull();
  });

  it('the main figure counts up from 0 once, and a success haptic marks the end', async () => {
    await renderScreen([done('w1', '2026-10-13T19:00:00Z', 100)]);

    expect(screen.getByText('0')).toBeOnTheScreen();
    await act(() => jest.advanceTimersByTime(1500));

    expect(screen.getByText('800')).toBeOnTheScreen();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success,
    );
  });

  it('RNF-16..18: with «Reducir movimiento» the values are there at once', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await renderScreen([done('w1', '2026-10-13T19:00:00Z', 100)]);
    await act(async () => {});

    expect(screen.getByText('800')).toBeOnTheScreen();
  });

  it('a read error says so, with «Listo» to leave', async () => {
    const workouts = new InMemoryWorkoutRepository(null, [done('w1', '2026-10-13T19:00:00Z', 100)]);
    await renderScreen([], 'w1', workouts);
    await act(() => workouts.failFinished());

    expect(screen.getByText(home.readError.title)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: strings.ready })).toBeOnTheScreen();
  });

  it('RF-PROG-05.AC2: a record beaten today is highlighted', async () => {
    await renderScreen([
      done('w1', '2026-10-10T19:00:00Z', 100),
      done('w2', '2026-10-13T19:00:00Z', 105),
    ]);

    expect(screen.getByText(strings.todayRecords)).toBeOnTheScreen();
    expect(screen.getByText(strings.recordTitle(strings.heaviestLoad))).toBeOnTheScreen();
    expect(screen.getAllByText('105 kg × 8').length).toBeGreaterThan(0);
    await act(() => jest.advanceTimersByTime(1500));
    // One success at the end of the entrance, and one for the records.
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(2);
  });

  it('a workout that is gone goes back to the tabs', async () => {
    const { onDone } = await renderScreen([done('w1', '2026-10-13T19:00:00Z', 100)], 'other');

    expect(onDone).toHaveBeenCalled();
  });

  it('RF-AUTH-01.AC5: a guest is invited to create an account (D13), and can say «Ahora no»', async () => {
    const { user, onCreateAccount } = await renderScreen([done('w1', '2026-10-13T19:00:00Z', 100)]);

    expect(await screen.findByText(dialogs.D13.title)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: dialogs.D13.notNow }));

    expect(screen.queryByText(dialogs.D13.title)).not.toBeOnTheScreen();
    expect(onCreateAccount).not.toHaveBeenCalled();
  });

  it('D13 «Crear cuenta» opens the sign-up', async () => {
    const { user, onCreateAccount } = await renderScreen([done('w1', '2026-10-13T19:00:00Z', 100)]);

    await user.press(await screen.findByRole('button', { name: dialogs.D13.createAccount }));

    expect(onCreateAccount).toHaveBeenCalledTimes(1);
  });
});
