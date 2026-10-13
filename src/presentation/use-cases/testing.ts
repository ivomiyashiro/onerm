import { ActivateRoutine } from '@/domain/usecases/activate-routine';
import { AdjustActiveRoutine } from '@/domain/usecases/adjust-active-routine';
import { AdoptTemplate } from '@/domain/usecases/adopt-template';
import { AnswerOnboarding } from '@/domain/usecases/answer-onboarding';
import { DeleteRoutine } from '@/domain/usecases/delete-routine';
import { FinishOnboarding } from '@/domain/usecases/finish-onboarding';
import { ObserveEntry } from '@/domain/usecases/observe-entry';
import { ObserveExerciseDetail } from '@/domain/usecases/observe-exercise-detail';
import { ObserveExercises } from '@/domain/usecases/observe-exercises';
import { ObserveNextDay } from '@/domain/usecases/observe-next-day';
import { ObserveWorkout } from '@/domain/usecases/observe-workout';
import { StartWorkout } from '@/domain/usecases/start-workout';
import { DeleteSet, LogSet, RestoreSet, UpdateSet } from '@/domain/usecases/workout-sets';
import { ObserveProfile } from '@/domain/usecases/observe-profile';
import { ObserveRecommendation } from '@/domain/usecases/observe-recommendation';
import { ObserveRoutines } from '@/domain/usecases/observe-routines';
import { ObserveTemplate } from '@/domain/usecases/observe-template';
import { EditRoutineDraft, LoadRoutineDraft, SaveRoutine } from '@/domain/usecases/routine-draft';
import { PrepareLocalData } from '@/domain/usecases/prepare-local-data';
import { StartAsGuest } from '@/domain/usecases/start-as-guest';
import { UpdateLoadSetting } from '@/domain/usecases/update-load-setting';
import { UpdateProfile } from '@/domain/usecases/update-profile';
import type { Exercise } from '@/domain/models/exercise';
import type { LocalDate } from '@/domain/models/local-date';
import type { Id } from '@/domain/models/vocabulary';
import type {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import type { UseCases } from '@/presentation/use-cases/use-cases-context';

const never = () => () => {};
/** The tests run with UTC dates, so the device zone of the machine plays no part. */
const utcDate = (instant: Date) => instant.toISOString().slice(0, 10) as LocalDate;
const epoch = () => new Date(0);
const noWrites = { save: async () => {}, delete: async () => {} };
const neverIds = () => {
  throw new Error('someUseCases: pass the use case that creates ids');
};

/**
 * Test builder: every use case over repositories that never emit, with only what a test cares
 * about overridden. Used by tests only.
 */
export function someUseCases(overrides: Partial<UseCases> = {}): UseCases {
  const routines = {
    observeAll: never,
    observeById: never,
    observeRotationDays: never,
    ...noWrites,
  };
  const templates = { observeAll: never };
  const profiles = { observe: never, ...noWrites };
  const workouts = { observeInProgress: never, observeFinished: never, ...noWrites };
  const exercises = { observeAll: never };
  const onboarding = { observeStep: never, saveStep: async () => {} };
  return {
    observeExercises: new ObserveExercises(exercises),
    observeExerciseDetail: new ObserveExerciseDetail({ observeById: never }, workouts),
    observeRoutines: new ObserveRoutines(routines, templates, profiles, workouts),
    observeTemplate: new ObserveTemplate(templates, profiles, routines, workouts, exercises),
    observeNextDay: new ObserveNextDay(profiles, routines, workouts, exercises, epoch, utcDate),
    adoptTemplate: new AdoptTemplate(templates, routines, profiles, workouts, neverIds),
    activateRoutine: new ActivateRoutine(profiles, workouts),
    deleteRoutine: new DeleteRoutine(routines, profiles, workouts),
    prepareLocalData: new PrepareLocalData({ prepare: async () => {} }),
    observeEntry: new ObserveEntry(profiles, onboarding),
    startAsGuest: new StartAsGuest(profiles, onboarding),
    answerOnboarding: new AnswerOnboarding(profiles, onboarding),
    observeRecommendation: new ObserveRecommendation(templates, profiles),
    observeProfile: new ObserveProfile(profiles),
    updateProfile: new UpdateProfile(profiles, { observeById: never }),
    adjustActiveRoutine: new AdjustActiveRoutine(profiles, { observeById: never, ...noWrites }),
    updateLoadSetting: new UpdateLoadSetting(profiles),
    finishOnboarding: new FinishOnboarding(profiles, onboarding, () => new Date(0)),
    loadRoutineDraft: new LoadRoutineDraft(routines, exercises, profiles, workouts, neverIds),
    editRoutineDraft: new EditRoutineDraft(neverIds),
    saveRoutine: new SaveRoutine(routines),
    observeWorkout: new ObserveWorkout(profiles, routines, workouts, exercises, utcDate),
    startWorkout: new StartWorkout(profiles, routines, workouts, exercises, neverIds, epoch),
    logSet: new LogSet(workouts, neverIds, epoch),
    updateSet: new UpdateSet(workouts),
    deleteSet: new DeleteSet(workouts),
    restoreSet: new RestoreSet(workouts, neverIds),
    ...overrides,
  };
}

/**
 * The routine and workout use cases over in-memory repositories: the test arranges the data and reads what
 * the writes left. Used by tests only.
 */
export function routineUseCasesOver(repositories: {
  routines: InMemoryRoutineRepository;
  templates: InMemoryRoutineTemplateRepository;
  profiles: InMemoryProfileRepository;
  workouts: InMemoryWorkoutRepository;
  exercises?: readonly Exercise[];
  newId?: () => Id;
  now?: () => Date;
}): Partial<UseCases> {
  const {
    routines,
    templates,
    profiles,
    workouts,
    exercises = [],
    newId = neverIds,
    now = epoch,
  } = repositories;
  const catalog = {
    observeAll: (observer: { next(value: Exercise[]): void }) => {
      observer.next([...exercises]);
      return () => {};
    },
  };
  return {
    observeExercises: new ObserveExercises(catalog),
    observeRoutines: new ObserveRoutines(routines, templates, profiles, workouts),
    observeTemplate: new ObserveTemplate(templates, profiles, routines, workouts, catalog),
    observeNextDay: new ObserveNextDay(profiles, routines, workouts, catalog, now, utcDate),
    adoptTemplate: new AdoptTemplate(templates, routines, profiles, workouts, newId),
    activateRoutine: new ActivateRoutine(profiles, workouts),
    deleteRoutine: new DeleteRoutine(routines, profiles, workouts),
    loadRoutineDraft: new LoadRoutineDraft(routines, catalog, profiles, workouts, newId),
    editRoutineDraft: new EditRoutineDraft(newId),
    saveRoutine: new SaveRoutine(routines),
    observeWorkout: new ObserveWorkout(profiles, routines, workouts, catalog, utcDate),
    startWorkout: new StartWorkout(profiles, routines, workouts, catalog, newId, now),
    logSet: new LogSet(workouts, newId, now),
    updateSet: new UpdateSet(workouts),
    deleteSet: new DeleteSet(workouts),
    restoreSet: new RestoreSet(workouts, newId),
  };
}
