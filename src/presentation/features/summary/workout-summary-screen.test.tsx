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
import { WorkoutSummaryScreen } from '@/presentation/features/summary/workout-summary-screen';
import { workout as text } from '@/presentation/strings/workout';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};
const SQUAT = anExercise({ name: 'Sentadilla' });
const CURL = anExercise({ id: 'curl', name: 'Curl' });

function done(id: string, finishedAt: string, loadKg: number): Workout {
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

async function renderScreen(finished: Workout[], id = finished.at(-1)!.id) {
  const onDone = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider
        useCases={someUseCases(
          routineUseCasesOver({
            routines: new InMemoryRoutineRepository([aRoutine()]),
            templates: new InMemoryRoutineTemplateRepository(),
            profiles: new InMemoryProfileRepository(defaultProfile()),
            workouts: new InMemoryWorkoutRepository(null, finished),
            exercises: [SQUAT, CURL],
          }),
        )}
      >
        <WorkoutSummaryScreen workoutId={id} onDone={onDone} />
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
  return { onDone, user: userEvent.setup() };
}

describe('WorkoutSummaryScreen (S12)', () => {
  it('RF-ENT-11.AC1: duration, sets, exercises and what was done, then «Listo»', async () => {
    const { user, onDone } = await renderScreen([done('w1', '2026-10-13T19:00:00Z', 100)]);

    expect(screen.getByRole('header', { name: text.summary.finished })).toBeOnTheScreen();
    expect(screen.getByText('52 min')).toBeOnTheScreen();
    expect(screen.getByText('1 de 2')).toBeOnTheScreen();
    expect(screen.getByText('1 serie · mejor 100 kg × 8')).toBeOnTheScreen();
    expect(screen.getByText(text.summary.skipped)).toBeOnTheScreen();
    // The first time is not a record (RN-PROG-03).
    expect(screen.queryByText(text.summary.todayRecords)).toBeNull();
    await user.press(screen.getByRole('button', { name: text.summary.ready }));

    expect(onDone).toHaveBeenCalled();
  });

  it('RF-PROG-05.AC2: a record beaten today is highlighted', async () => {
    await renderScreen([
      done('w1', '2026-10-10T19:00:00Z', 100),
      done('w2', '2026-10-13T19:00:00Z', 105),
    ]);

    expect(screen.getByText(text.summary.todayRecords)).toBeOnTheScreen();
    expect(screen.getByText(text.summary.recordTitle(text.summary.heaviestLoad))).toBeOnTheScreen();
    expect(screen.getByText('105 kg × 8')).toBeOnTheScreen();
  });

  it('a workout that is gone goes back to the tabs', async () => {
    const { onDone } = await renderScreen([done('w1', '2026-10-13T19:00:00Z', 100)], 'other');

    expect(onDone).toHaveBeenCalled();
  });
});
