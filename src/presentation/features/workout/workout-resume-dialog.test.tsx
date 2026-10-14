import { render, screen, userEvent } from '@testing-library/react-native';

import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutine, aWorkout } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { WorkoutResumeDialog } from '@/presentation/features/workout/workout-resume-dialog';
import { dialogs } from '@/presentation/strings/dialogs';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();

const STARTED = new Date(2026, 8, 28, 18);
const RUNNING = aWorkout({ status: 'in_progress', startedAt: STARTED, finishedAt: null });

it('RF-ENT-13.AC2: D02 for an abandoned workout; «Finalizarlo» goes to its summary', async () => {
  const workouts = new InMemoryWorkoutRepository(RUNNING);
  const onFinished = jest.fn();
  await render(
    <UseCasesProvider
      useCases={someUseCases(
        routineUseCasesOver({
          routines: new InMemoryRoutineRepository([aRoutine()]),
          templates: new InMemoryRoutineTemplateRepository(),
          profiles: new InMemoryProfileRepository(defaultProfile()),
          workouts,
          now: () => new Date(2026, 8, 29, 18),
        }),
      )}
    >
      <WorkoutResumeDialog onResume={jest.fn()} onFinished={onFinished} />
    </UseCasesProvider>,
  );

  expect(await screen.findByText(dialogs.D02.body('lunes 28 de septiembre', 0))).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByRole('button', { name: dialogs.D02.finish }));

  expect(workouts.finished[0].finishedAt).toEqual(STARTED);
  expect(onFinished).toHaveBeenCalledWith(RUNNING.id);
});
