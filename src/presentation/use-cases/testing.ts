import { ActivateRoutine } from '@/domain/usecases/activate-routine';
import { AdoptTemplate } from '@/domain/usecases/adopt-template';
import { DeleteRoutine } from '@/domain/usecases/delete-routine';
import { ObserveExerciseDetail } from '@/domain/usecases/observe-exercise-detail';
import { ObserveExercises } from '@/domain/usecases/observe-exercises';
import { ObserveNextDay } from '@/domain/usecases/observe-next-day';
import { ObserveRoutines } from '@/domain/usecases/observe-routines';
import { ObserveTemplate } from '@/domain/usecases/observe-template';
import { PrepareLocalData } from '@/domain/usecases/prepare-local-data';
import type { Exercise } from '@/domain/models/exercise';
import type { Id } from '@/domain/models/vocabulary';
import type {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import type { UseCases } from '@/presentation/use-cases/use-cases-context';

const never = () => () => {};
const noWrites = { save: async () => {}, delete: async () => {} };
const neverIds = () => {
  throw new Error('someUseCases: pass the use case that creates ids');
};

/**
 * Test builder: every use case over repositories that never emit, with only what a test cares
 * about overridden. Used by tests only.
 */
export function someUseCases(overrides: Partial<UseCases> = {}): UseCases {
  const routines = { observeAll: never, observeRotationDays: never, ...noWrites };
  const templates = { observeAll: never };
  const profiles = { observe: never, ...noWrites };
  const workouts = { observeInProgress: never, observeFinished: never };
  const exercises = { observeAll: never };
  return {
    observeExercises: new ObserveExercises(exercises),
    observeExerciseDetail: new ObserveExerciseDetail({ observeById: never }, workouts),
    observeRoutines: new ObserveRoutines(routines, templates, profiles, workouts),
    observeTemplate: new ObserveTemplate(templates, profiles, routines, workouts, exercises),
    observeNextDay: new ObserveNextDay(profiles, routines, workouts, exercises),
    adoptTemplate: new AdoptTemplate(templates, routines, profiles, workouts, neverIds),
    activateRoutine: new ActivateRoutine(profiles, workouts),
    deleteRoutine: new DeleteRoutine(routines, profiles, workouts),
    prepareLocalData: new PrepareLocalData({ prepare: async () => {} }),
    ...overrides,
  };
}

/**
 * The routine use cases over in-memory repositories: the test arranges the data and reads what
 * the writes left. Used by tests only.
 */
export function routineUseCasesOver(repositories: {
  routines: InMemoryRoutineRepository;
  templates: InMemoryRoutineTemplateRepository;
  profiles: InMemoryProfileRepository;
  workouts: InMemoryWorkoutRepository;
  exercises?: readonly Exercise[];
  newId?: () => Id;
}): Partial<UseCases> {
  const {
    routines,
    templates,
    profiles,
    workouts,
    exercises = [],
    newId = neverIds,
  } = repositories;
  const catalog = {
    observeAll: (observer: { next(value: Exercise[]): void }) => {
      observer.next([...exercises]);
      return () => {};
    },
  };
  return {
    observeRoutines: new ObserveRoutines(routines, templates, profiles, workouts),
    observeTemplate: new ObserveTemplate(templates, profiles, routines, workouts, catalog),
    observeNextDay: new ObserveNextDay(profiles, routines, workouts, catalog),
    adoptTemplate: new AdoptTemplate(templates, routines, profiles, workouts, newId),
    activateRoutine: new ActivateRoutine(profiles, workouts),
    deleteRoutine: new DeleteRoutine(routines, profiles, workouts),
  };
}
