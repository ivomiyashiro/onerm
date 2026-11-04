import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { defaultProfile } from '@/domain/rules/routine/default-profile';
import {
  aPrescription,
  aRoutine,
  aRoutineDay,
  aRoutineExercise,
  anExercise,
} from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { RoutineEditorScreen } from '@/presentation/features/routine-editor/routine-editor-screen';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};

const exerciseOf = (id: string, exerciseId: string) =>
  aRoutineExercise({ id, exerciseId, prescription: aPrescription() });
const ROUTINE = aRoutine({
  name: 'Mi rutina',
  days: [
    aRoutineDay({
      id: 'day-1',
      name: 'Día A',
      exercises: [exerciseOf('re-1', 'leg-press'), exerciseOf('re-2', 'curl')],
    }),
    aRoutineDay({
      id: 'day-2',
      name: 'Día B',
      position: 1,
      exercises: [exerciseOf('re-3', 'curl')],
    }),
  ],
});

/** The editor over a routine with two days, for the tests that drag (one file each: see them). */
export async function renderReorderScreen() {
  const repositories = {
    routines: new InMemoryRoutineRepository([ROUTINE]),
    templates: new InMemoryRoutineTemplateRepository(),
    profiles: new InMemoryProfileRepository({ ...defaultProfile(), goal: 'hypertrophy' }),
    workouts: new InMemoryWorkoutRepository(null),
    exercises: [
      anExercise({ id: 'leg-press', name: 'Prensa de piernas' }),
      anExercise({ id: 'curl', name: 'Curl de bíceps', mechanic: 'isolation' }),
    ],
    newId: () => 'new-1',
  };
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider useCases={someUseCases(routineUseCasesOver(repositories))}>
        <RoutineEditorScreen routineId="routine-1" onClose={jest.fn()} onGoToWorkout={jest.fn()} />
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
  await screen.findByDisplayValue('Mi rutina');
  return { ...repositories, user: userEvent.setup() };
}

export const layOut = (testId: string, x: number, y: number, width: number, height: number) =>
  fireEvent(screen.getByTestId(testId), 'layout', {
    nativeEvent: { layout: { x, y, width, height } },
  });
