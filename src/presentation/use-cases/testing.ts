import { AnswerAccountNudge, ReadAccountNudge } from '@/domain/usecases/account-nudge';
import { ObserveSessionLoss } from '@/domain/usecases/observe-session-loss';
import { ContinueAfterAuth } from '@/domain/usecases/continue-after-auth';
import { ReadAccount } from '@/domain/usecases/read-account';
import { CompletePasswordRecovery } from '@/domain/usecases/complete-password-recovery';
import { OpenRecoveryLink } from '@/domain/usecases/open-recovery-link';
import { RequestPasswordReset } from '@/domain/usecases/request-password-reset';
import { ContinueWithGoogle } from '@/domain/usecases/continue-with-google';
import { SignIn } from '@/domain/usecases/sign-in';
import { KeepBackedUp } from '@/domain/usecases/keep-backed-up';
import { ObserveBackupNotice } from '@/domain/usecases/observe-backup-notice';
import { ObserveSyncStatus } from '@/domain/usecases/observe-sync-status';
import { SyncNow } from '@/domain/usecases/sync-now';
import {
  DiscardRejectedChange,
  ObserveRejectedChanges,
  RetryRejectedChange,
} from '@/domain/usecases/rejected-changes';
import { BackUpBeforeSignOut, ConfirmSignOut, PrepareSignOut } from '@/domain/usecases/sign-out';
import { SyncScheduler } from '@/domain/usecases/sync-scheduler';
import { SignUp } from '@/domain/usecases/sign-up';
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
import { ObserveWorkoutInProgress } from '@/domain/usecases/observe-workout-in-progress';
import { ObserveExerciseProgress } from '@/domain/usecases/observe-exercise-progress';
import { ObserveHistory } from '@/domain/usecases/observe-history';
import { ObserveWeeklyVolume } from '@/domain/usecases/observe-weekly-volume';
import { ObserveWorkoutDetail } from '@/domain/usecases/observe-workout-detail';
import { ObserveWorkoutSummary } from '@/domain/usecases/observe-workout-summary';
import {
  AddPastSet,
  DeletePastSet,
  DeleteWorkout,
  UpdatePastSet,
} from '@/domain/usecases/past-workout-edits';
import {
  AddRestTime,
  AskRestPermission,
  ObserveRestTimer,
  ReadRestPermissions,
  RescheduleRest,
  SkipRest,
  StartRest,
} from '@/domain/usecases/rest-timer';
import { StartWorkout } from '@/domain/usecases/start-workout';
import {
  DiscardWorkout,
  FinishWorkout,
  ReadWorkoutResume,
  SkipExercise,
  SubstituteExercise,
} from '@/domain/usecases/workout-lifecycle';
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
import type { LocalSyncState } from '@/domain/repositories/sync-state-repository';
import type { RejectedChange } from '@/domain/models/rejected-change';
import type { Observer } from '@/domain/repositories/observer';
import type { ExerciseRepository } from '@/domain/repositories/exercise-repository';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import {
  FakeAuthGateway,
  FakeDevicePermissions,
  FakeRestNotifier,
  InMemoryAccountRepository,
  InMemoryRestTimerRepository,
} from '@/domain/testing/in-memory-repositories';
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
    ...accountUseCases(),
    continueAfterAuth: new ContinueAfterAuth(profiles, onboarding, restoredSyncState),
    updateProfile: new UpdateProfile(profiles, { observeById: never }),
    adjustActiveRoutine: new AdjustActiveRoutine(profiles, { observeById: never, ...noWrites }),
    updateLoadSetting: new UpdateLoadSetting(profiles),
    finishOnboarding: new FinishOnboarding(profiles, onboarding, () => new Date(0)),
    loadRoutineDraft: new LoadRoutineDraft(routines, exercises, profiles, workouts, neverIds),
    editRoutineDraft: new EditRoutineDraft(neverIds),
    saveRoutine: new SaveRoutine(routines),
    observeWorkout: new ObserveWorkout(profiles, routines, workouts, exercises, utcDate),
    observeWorkoutInProgress: new ObserveWorkoutInProgress(workouts),
    startWorkout: new StartWorkout(profiles, routines, workouts, exercises, neverIds, epoch),
    logSet: new LogSet(workouts, neverIds, epoch),
    updateSet: new UpdateSet(workouts),
    deleteSet: new DeleteSet(workouts),
    restoreSet: new RestoreSet(workouts, neverIds),
    ...restUseCasesOver(),
    ...lifecycle(workouts, neverIds, epoch),
    ...history(profiles, workouts, exercises, neverIds, epoch),
    observeWorkoutSummary: new ObserveWorkoutSummary(
      profiles,
      routines,
      workouts,
      exercises,
      epoch,
      utcDate,
    ),
    ...overrides,
  };
}

/** The account use cases over a guest device and a provider that answers «signed in». */
function accountUseCases() {
  const gateway = new FakeAuthGateway();
  const account = new InMemoryAccountRepository();
  return {
    readAccount: new ReadAccount(gateway, account),
    observeSessionLoss: new ObserveSessionLoss(gateway, account),
    readAccountNudge: new ReadAccountNudge(account, epoch),
    answerAccountNudge: new AnswerAccountNudge(account, epoch),
    signUp: new SignUp(gateway, account),
    signIn: new SignIn(gateway, account),
    continueWithGoogle: new ContinueWithGoogle(gateway, account),
    requestPasswordReset: new RequestPasswordReset(gateway),
    openRecoveryLink: new OpenRecoveryLink(gateway, account),
    completePasswordRecovery: new CompletePasswordRecovery(gateway, account),
    prepareSignOut: new PrepareSignOut(account),
    backUpBeforeSignOut: new BackUpBeforeSignOut(offlineSync, account),
    confirmSignOut: new ConfirmSignOut(gateway, account),
    keepBackedUp: new KeepBackedUp(offlineSync, { subscribe: never }),
    observeSyncStatus: syncStatusOver(BACKED_UP),
    observeBackupNotice: backupNoticeOver(BACKED_UP),
    syncNow: new SyncNow(offlineSync),
    ...rejectedChangesOver(),
  };
}

/**
 * The backup status over a fixed local state, without a workout in progress and with a scheduler
 * that never synced. Used by tests only.
 */
export function syncStatusOver(
  local: LocalSyncState,
  scheduler: Pick<SyncScheduler, 'observeActivity'> = offlineSync,
): ObserveSyncStatus {
  return new ObserveSyncStatus(
    { observe: (observer) => (observer.next(local), () => {}) },
    { observeInProgress: (observer) => (observer.next(null), () => {}) },
    scheduler,
  );
}

/**
 * The rejected changes of S25 over a fixed list, recording what was discarded or retried. Used
 * by tests only.
 */
export function rejectedChangesOver(
  changes: RejectedChange[] = [],
  discardResult: 'done' | 'offline' = 'done',
) {
  const calls = { discarded: [] as string[], retried: [] as string[] };
  const repository = {
    observe: (observer: Observer<RejectedChange[]>) => (observer.next(changes), () => {}),
    discard: async (change: RejectedChange) => {
      calls.discarded.push(change.id);
      return discardResult;
    },
    retry: async (change: RejectedChange) => void calls.retried.push(change.id),
  };
  return {
    observeRejectedChanges: new ObserveRejectedChanges(repository),
    discardRejectedChange: new DiscardRejectedChange(repository),
    retryRejectedChange: new RetryRejectedChange(repository, offlineSync),
    calls,
  };
}

/** The backup notice of S07 over a fixed local state. Used by tests only. */
export function backupNoticeOver(local: LocalSyncState): ObserveBackupNotice {
  return new ObserveBackupNotice(
    { observe: (observer) => (observer.next(local), () => {}) },
    offlineSync,
  );
}

/** A device with nothing to back up or restore. Used by tests only. */
export const restoredSyncState = {
  observe: (observer: Observer<LocalSyncState>) => (observer.next(BACKED_UP), () => {}),
};

const BACKED_UP: LocalSyncState = {
  pending: 0,
  conflicts: 0,
  lastSyncedAt: null,
  restoreCompleted: true,
};

/** A sync that never reaches a server, and never has anything to upload. */
const offlineSync = new SyncScheduler({ sync: async () => 'failed' }, async () => 0);

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
  /** What finishing and discarding do to the rest; nothing by default. */
  stopRest?: Pick<SkipRest, 'execute'>;
}): Partial<UseCases> {
  const {
    routines,
    templates,
    profiles,
    workouts,
    exercises = [],
    newId = neverIds,
    now = epoch,
    stopRest,
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
    observeWorkoutInProgress: new ObserveWorkoutInProgress(workouts),
    startWorkout: new StartWorkout(profiles, routines, workouts, catalog, newId, now),
    logSet: new LogSet(workouts, newId, now),
    updateSet: new UpdateSet(workouts),
    deleteSet: new DeleteSet(workouts),
    restoreSet: new RestoreSet(workouts, newId),
    ...lifecycle(workouts, newId, now, stopRest),
    ...history(profiles, workouts, catalog, newId, now),
    observeWorkoutSummary: new ObserveWorkoutSummary(
      profiles,
      routines,
      workouts,
      catalog,
      now,
      utcDate,
    ),
  };
}

/** S18, S19 and S20: the history, the detail, the edits of the past and the progress. */
function history(
  profiles: Pick<InMemoryProfileRepository, 'observe'>,
  workouts: Pick<WorkoutRepository, 'observeFinished' | 'save' | 'delete'>,
  exercises: { observeAll: ExerciseRepository['observeAll'] },
  newId: () => Id,
  now: () => Date,
) {
  return {
    observeExerciseProgress: new ObserveExerciseProgress(
      profiles,
      workouts,
      exercises,
      now,
      utcDate,
    ),
    observeWeeklyVolume: new ObserveWeeklyVolume(profiles, workouts, exercises, now, utcDate),
    observeHistory: new ObserveHistory(workouts),
    observeWorkoutDetail: new ObserveWorkoutDetail(profiles, workouts, exercises),
    updatePastSet: new UpdatePastSet(workouts),
    addPastSet: new AddPastSet(workouts, newId),
    deletePastSet: new DeletePastSet(workouts),
    deleteWorkout: new DeleteWorkout(workouts),
  };
}

/** Skip, substitute, finish, discard and resume over `workouts`. */
function lifecycle(
  workouts: Pick<WorkoutRepository, 'observeInProgress' | 'save' | 'delete'>,
  newId: () => Id,
  now: () => Date,
  stopRest: Pick<SkipRest, 'execute'> = { execute: async () => {} },
) {
  return {
    skipExercise: new SkipExercise(workouts),
    substituteExercise: new SubstituteExercise(workouts, newId),
    finishWorkout: new FinishWorkout(workouts, stopRest, now),
    discardWorkout: new DiscardWorkout(workouts, stopRest),
    readWorkoutResume: new ReadWorkoutResume(workouts, now),
  };
}

/**
 * The rest timer use cases over an in-memory timer and fake device: by default notifications and
 * exact alarms are allowed. Used by tests only.
 */
export function restUseCasesOver({
  timers = new InMemoryRestTimerRepository(),
  notifier = new FakeRestNotifier(),
  permissions = new FakeDevicePermissions(),
  now = epoch,
}: {
  timers?: InMemoryRestTimerRepository;
  notifier?: FakeRestNotifier;
  permissions?: FakeDevicePermissions;
  now?: () => Date;
} = {}): Partial<UseCases> &
  Pick<
    UseCases,
    | 'observeRestTimer'
    | 'startRest'
    | 'addRestTime'
    | 'rescheduleRest'
    | 'skipRest'
    | 'askRestPermission'
    | 'readRestPermissions'
  > {
  const rest = [timers, notifier, permissions, now] as const;
  return {
    observeRestTimer: new ObserveRestTimer(timers),
    startRest: new StartRest(...rest),
    addRestTime: new AddRestTime(...rest),
    rescheduleRest: new RescheduleRest(...rest),
    skipRest: new SkipRest(timers, notifier),
    askRestPermission: new AskRestPermission(timers, permissions),
    readRestPermissions: new ReadRestPermissions(timers, permissions),
  };
}
