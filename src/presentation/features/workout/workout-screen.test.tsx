import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { Vibration } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Workout } from '@/domain/models/workout';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import {
  anExercise,
  aBilateralSet,
  aPrescription,
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
import { WorkoutScreen } from '@/presentation/features/workout/workout-screen';
import { common } from '@/presentation/strings/common';
import { home } from '@/presentation/strings/home';
import { suggestions } from '@/presentation/strings/suggestions';
import { workout as text } from '@/presentation/strings/workout';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider, type UseCases } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};

const ROW = anExercise({
  id: 'one-arm-row',
  name: 'Remo con mancuerna a una mano',
  primaryEquipment: 'dumbbell',
  isUnilateral: true,
});
const PRESS = anExercise({ id: 'press', name: 'Press de banca' });
const RUNNING = aWorkout({
  status: 'in_progress',
  finishedAt: null,
  exercises: [
    aWorkoutExercise({
      id: 'we-1',
      exerciseId: 'one-arm-row',
      isUnilateral: true,
      prescription: aPrescription({ sets: 1 }),
    }),
    aWorkoutExercise({ id: 'we-2', exerciseId: 'press', position: 1 }),
  ],
});

async function renderScreen({
  inProgress = RUNNING as Workout | null,
  useCases = undefined as UseCases | undefined,
} = {}) {
  const workouts = new InMemoryWorkoutRepository(inProgress, []);
  let n = 0;
  const onClose = jest.fn();
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
              workouts,
              exercises: [ROW, PRESS],
              newId: () => `set-${++n}`,
              now: () => new Date('2026-10-13T18:05:00Z'),
            }),
          )
        }
      >
        <WorkoutScreen onClose={onClose} />
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
  return { workouts, onClose, user: userEvent.setup() };
}

describe('WorkoutScreen (S09)', () => {
  it('loading: nothing yet', async () => {
    await renderScreen({ useCases: someUseCases() });

    expect(screen.queryByRole('button', { name: text.primaryAction.done })).not.toBeOnTheScreen();
  });

  it('no workout in progress: goes back', async () => {
    const { onClose } = await renderScreen({ inProgress: null });

    expect(onClose).toHaveBeenCalled();
  });

  it('error: says the data is still on the phone', async () => {
    const { workouts } = await renderScreen();
    await act(() => workouts.fail());

    expect(screen.getByText(home.readError.title)).toBeOnTheScreen();
  });

  it('content: the exercise, «Unilateral», the current set and «Hecho»', async () => {
    await renderScreen();

    expect(screen.getByRole('header', { name: ROW.name })).toBeOnTheScreen();
    expect(screen.getByText(text.set.unilateral)).toBeOnTheScreen();
    expect(screen.getByText(text.set.tapToAdjust)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: text.primaryAction.done })).toBeOnTheScreen();
  });

  it('RF-ENT-03.AC2, AC3: a split unilateral set from the sheet, with the load per dumbbell', async () => {
    const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});
    const { user, workouts } = await renderScreen();

    await user.press(screen.getByRole('button', { name: text.primaryAction.done }));
    await user.press(screen.getByRole('button', { name: text.set.increaseLoad }));
    expect(screen.getByText('por mancuerna')).toBeOnTheScreen();
    // A native switch: pressing it in Jest doesn't change its value.
    await act(() =>
      fireEvent(
        screen.getByRole('switch', { name: text.set.differentPerSide }),
        'valueChange',
        true,
      ),
    );
    await user.press(screen.getAllByRole('button', { name: text.set.decreaseReps })[0]);
    await user.press(screen.getAllByRole('button', { name: text.primaryAction.done }).at(-1)!);

    expect(workouts.inProgress!.exercises[0].sets).toMatchObject([
      { loadKg: 2, repsLeft: 7, repsRight: 8 },
    ]);
    // RF-ENT-02.AC1: a short vibration once it is saved.
    expect(vibrate).toHaveBeenCalledTimes(1);
    // RF-ENT-02.AC7: its only set was logged, so the next exercise shows.
    expect(screen.getByRole('header', { name: PRESS.name })).toBeOnTheScreen();
  });

  it('«Ver todos» goes to another exercise', async () => {
    const { user } = await renderScreen();

    await user.press(screen.getByRole('button', { name: text.header.seeAll }));
    await user.press(screen.getByRole('button', { name: PRESS.name }));

    expect(screen.getByRole('header', { name: PRESS.name })).toBeOnTheScreen();
  });

  it('RF-ENT-04.AC1, RF-ENT-02.AC5: a typed load out of range keeps the sheet open with the error', async () => {
    const { user, workouts } = await renderScreen({
      inProgress: {
        ...RUNNING,
        exercises: [
          {
            ...RUNNING.exercises[1],
            status: 'done',
            sets: [aBilateralSet({ id: 's1', workoutExerciseId: 'we-2', loadKg: 60, reps: 8 })],
          },
        ],
      },
    });

    await user.press(screen.getAllByText('× 8')[0]);
    await user.clear(screen.getByLabelText(text.set.load));
    await user.type(screen.getByLabelText(text.set.load), '3000');
    await user.press(screen.getByRole('button', { name: text.editSet.saveChanges }));

    expect(screen.getByText(text.validation.load('1000', 'kg'))).toBeOnTheScreen();
    expect(workouts.inProgress!.exercises[0].sets[0].loadKg).toBe(60);
  });

  it('RF-SUG-07: the reason under the exercise, and «¿Por qué?» opens S10 until «Entendido»', async () => {
    const { user } = await renderScreen();

    expect(screen.getByText(suggestions.reasons.CALIBRATION.novice(8, 12))).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: common.why }));
    expect(screen.getByText(suggestions.why.calibrationTitle)).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /En qué nos basamos/ }));
    expect(screen.getByText(/podemos estimar tu máximo/)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: suggestions.why.understood }));
    expect(screen.queryByText(suggestions.why.calibrationTitle)).not.toBeOnTheScreen();
  });

  it('RF-SUG-02.AC4: a calibration set without effort blocks «Hecho» until it is chosen', async () => {
    const { user, workouts } = await renderScreen({
      inProgress: {
        ...RUNNING,
        exercises: [
          {
            ...RUNNING.exercises[1],
            sets: [
              aBilateralSet({
                id: 's1',
                workoutExerciseId: 'we-2',
                loadKg: 60,
                reps: 8,
                rir: null,
              }),
            ],
          },
        ],
      },
    });

    expect(screen.getByText(text.calibration.missingEffort)).toBeOnTheScreen();
    expect(screen.getByText(text.calibration.askEffortForSet(1))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: text.primaryAction.done })).toBeDisabled();

    await user.press(screen.getByRole('radio', { name: text.effort.simple.twoOrThree }));

    expect(workouts.inProgress!.exercises[0].sets[0]).toMatchObject({ rir: 2 });
    expect(screen.getByRole('button', { name: text.primaryAction.done })).toBeEnabled();
  });
});
