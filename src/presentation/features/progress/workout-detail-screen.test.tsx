import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
import { WorkoutDetailScreen } from '@/presentation/features/progress/workout-detail-screen';
import { dialogs } from '@/presentation/strings/dialogs';
import { progress } from '@/presentation/strings/progress';
import { workout } from '@/presentation/strings/workout';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};
const text = progress.workoutDetail;
const ROW = anExercise({ id: 'cable-row', name: 'Remo sentado en polea' });
const ONE_ARM = anExercise({ id: 'one-arm-row', name: 'Remo con mancuerna' });
const PAST = aWorkout({
  id: 'w1',
  dayNameSnapshot: 'Día A',
  routineNameSnapshot: 'Cuerpo completo',
  exercises: [
    aWorkoutExercise({
      id: 'we-1',
      workoutId: 'w1',
      plannedExerciseId: 'cable-row',
      exerciseId: 'one-arm-row',
      status: 'done',
      sets: [aBilateralSet({ id: 's1', workoutExerciseId: 'we-1', loadKg: 20, reps: 10 })],
    }),
    aWorkoutExercise({
      id: 'we-2',
      workoutId: 'w1',
      position: 1,
      plannedExerciseId: 'cable-row',
      exerciseId: 'cable-row',
      status: 'skipped',
    }),
  ],
});

async function renderScreen() {
  const workouts = new InMemoryWorkoutRepository(null, [PAST]);
  const onClose = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider
        useCases={someUseCases(
          routineUseCasesOver({
            routines: new InMemoryRoutineRepository([aRoutine()]),
            templates: new InMemoryRoutineTemplateRepository(),
            profiles: new InMemoryProfileRepository(defaultProfile()),
            workouts,
            exercises: [ROW, ONE_ARM],
          }),
        )}
      >
        <WorkoutDetailScreen workoutId="w1" onClose={onClose} />
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
  return { workouts, onClose, user: userEvent.setup() };
}

describe('WorkoutDetailScreen (S19)', () => {
  it('RF-PROG-02.AC1: the exercises with their sets, the substitute and the skipped one', async () => {
    await renderScreen();

    expect(screen.getByText('Día A · Cuerpo completo')).toBeOnTheScreen();
    expect(screen.getByText(text.substitutes('Remo sentado en polea'))).toBeOnTheScreen();
    expect(screen.getByText(text.skipped)).toBeOnTheScreen();
  });

  it('RF-PROG-03.AC1: editing, a set is corrected with «Guardar cambios»', async () => {
    const { user, workouts } = await renderScreen();

    await user.press(screen.getByRole('button', { name: text.edit }));
    expect(screen.getByText(text.editHelp)).toBeOnTheScreen();
    await user.press(screen.getAllByRole('button', { name: /20/ })[0]);
    await user.press(screen.getAllByRole('button', { name: workout.set.increaseReps })[0]);
    await user.press(screen.getByRole('button', { name: workout.editSet.saveChanges }));

    expect(workouts.finished[0].exercises[0].sets[0]).toMatchObject({ reps: 11 });
  });

  it('RF-PROG-03.AC4: «Eliminar entrenamiento» asks with D16, then goes back', async () => {
    const { user, workouts, onClose } = await renderScreen();

    await user.press(screen.getByRole('button', { name: text.edit }));
    await user.press(screen.getByRole('button', { name: text.menu }));
    await user.press(screen.getByRole('button', { name: text.delete }));
    expect(screen.getByText(dialogs.D16.body('workout', 1))).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: dialogs.D16.deleteDestructive }));

    expect(workouts.finished).toEqual([]);
    expect(onClose).toHaveBeenCalled();
  });
});
