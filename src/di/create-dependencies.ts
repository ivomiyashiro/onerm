import { deviceLocalDate } from '@/data/calendar/device-local-date';
import { CATALOG_SNAPSHOT } from '@/data/catalog/catalog-snapshot';
import { loadCatalogSnapshot } from '@/data/catalog/load-catalog-snapshot';
import { expoSqliteDriver, expoTableChanges } from '@/data/db/expo-sqlite-driver';
import { SqliteLocalDatabase, type PreparedLocalDatabase } from '@/data/db/sqlite-local-database';
import type { AppDatabase } from '@/data/db/app-database';
import type { TableChanges } from '@/data/db/table-changes';
import { ExpoDevicePermissions } from '@/data/device/expo-device-permissions';
import { ExpoRestNotifier, silenceRestNoticeInForeground } from '@/data/device/expo-rest-notifier';
import { LiveActivityRestCountdown } from '@/data/device/live-activity-rest-countdown';
import { NotificationRestCountdown } from '@/data/device/notification-rest-countdown';
import { randomUUID } from 'expo-crypto';
import { Platform } from 'react-native';

import { appAuth } from '@/data/auth/app-supabase';
import { SqliteAccountRepository } from '@/data/repositories/sqlite-account-repository';

import { SqliteExerciseRepository } from '@/data/repositories/sqlite-exercise-repository';
import { SqliteOnboardingRepository } from '@/data/repositories/sqlite-onboarding-repository';
import { SqliteProfileRepository } from '@/data/repositories/sqlite-profile-repository';
import { SqliteRestTimerRepository } from '@/data/repositories/sqlite-rest-timer-repository';
import { SqliteRoutineRepository } from '@/data/repositories/sqlite-routine-repository';
import { SqliteRoutineTemplateRepository } from '@/data/repositories/sqlite-routine-template-repository';
import { SqliteWorkoutRepository } from '@/data/repositories/sqlite-workout-repository';
import { appBackup, type Backup } from '@/data/sync/app-backup';
import { SqliteSyncStateRepository } from '@/data/sync/sqlite-sync-state-repository';
import type { Id } from '@/domain/models/vocabulary';
import type { AuthGateway } from '@/domain/services/auth-gateway';
import type { DevicePermissions } from '@/domain/services/device-permissions';
import type { RestCountdown } from '@/domain/services/rest-countdown';
import type { RestNotifier } from '@/domain/services/rest-notifier';
import { KeepBackedUp } from '@/domain/usecases/sync/keep-backed-up';
import {
  CancelGuestUnion,
  FinishGuestUnion,
  ReadPendingUnion,
  StartGuestUnion,
} from '@/domain/usecases/auth/guest-union';
import { ObserveBackupNotice } from '@/domain/usecases/sync/observe-backup-notice';
import { ObserveRestoration } from '@/domain/usecases/sync/observe-restoration';
import { ObserveSyncActivity } from '@/domain/usecases/sync/observe-sync-activity';
import { ObserveSyncStatus } from '@/domain/usecases/sync/observe-sync-status';
import { SyncNow } from '@/domain/usecases/sync/sync-now';
import {
  DiscardRejectedChange,
  ObserveRejectedChanges,
  RetryRejectedChange,
} from '@/domain/usecases/sync/rejected-changes';
import { SyncScheduler } from '@/domain/usecases/sync/sync-scheduler';
import { ActivateRoutine } from '@/domain/usecases/routines/activate-routine';
import { AdjustActiveRoutine } from '@/domain/usecases/routines/adjust-active-routine';
import { AdoptTemplate } from '@/domain/usecases/routines/adopt-template';
import { AnswerOnboarding } from '@/domain/usecases/onboarding/answer-onboarding';
import { DeleteRoutine } from '@/domain/usecases/routines/delete-routine';
import { FinishOnboarding } from '@/domain/usecases/onboarding/finish-onboarding';
import { ObserveEntry } from '@/domain/usecases/startup/observe-entry';
import { ObserveExerciseDetail } from '@/domain/usecases/exercises/observe-exercise-detail';
import { ObserveExercises } from '@/domain/usecases/exercises/observe-exercises';
import { ObserveNextDay } from '@/domain/usecases/routines/observe-next-day';
import { ObserveWorkout } from '@/domain/usecases/workout/observe-workout';
import { ObserveWorkoutInProgress } from '@/domain/usecases/workout/observe-workout-in-progress';
import { ObserveExerciseProgress } from '@/domain/usecases/progress/observe-exercise-progress';
import { ObserveHistory } from '@/domain/usecases/progress/observe-history';
import { ObserveWeeklyVolume } from '@/domain/usecases/progress/observe-weekly-volume';
import { ObserveWorkoutDetail } from '@/domain/usecases/progress/observe-workout-detail';
import { ObserveWorkoutSummary } from '@/domain/usecases/workout/observe-workout-summary';
import {
  AddPastSet,
  DeletePastSet,
  DeleteWorkout,
  UpdatePastSet,
} from '@/domain/usecases/progress/past-workout-edits';
import {
  AddRestTime,
  AskRestPermission,
  ObserveRestTimer,
  ReadRestPermissions,
  RescheduleRest,
  SkipRest,
  StartRest,
} from '@/domain/usecases/workout/rest-timer';
import { StartWorkout } from '@/domain/usecases/workout/start-workout';
import {
  DiscardWorkout,
  FinishWorkout,
  ReadWorkoutResume,
  SubstituteExercise,
} from '@/domain/usecases/workout/workout-lifecycle';
import { DeleteSet, LogSet, RestoreSet, UpdateSet } from '@/domain/usecases/workout/workout-sets';
import { ObserveProfile } from '@/domain/usecases/profile/observe-profile';
import { ObserveRecommendation } from '@/domain/usecases/onboarding/observe-recommendation';
import { ObserveRoutines } from '@/domain/usecases/routines/observe-routines';
import { ObserveTemplate } from '@/domain/usecases/routines/observe-template';
import {
  EditRoutineDraft,
  LoadRoutineDraft,
  SaveRoutine,
} from '@/domain/usecases/routines/routine-draft';
import { PrepareLocalData } from '@/domain/usecases/startup/prepare-local-data';
import { AnswerAccountNudge, ReadAccountNudge } from '@/domain/usecases/auth/account-nudge';
import { ObserveSessionLoss } from '@/domain/usecases/auth/observe-session-loss';
import { ContinueAfterAuth } from '@/domain/usecases/auth/continue-after-auth';
import { ReadAccount } from '@/domain/usecases/auth/read-account';
import { CompletePasswordRecovery } from '@/domain/usecases/auth/complete-password-recovery';
import { OpenRecoveryLink } from '@/domain/usecases/auth/open-recovery-link';
import { RequestPasswordReset } from '@/domain/usecases/auth/request-password-reset';
import { ContinueWithGoogle } from '@/domain/usecases/auth/continue-with-google';
import { SignIn } from '@/domain/usecases/auth/sign-in';
import {
  BackUpBeforeSignOut,
  ConfirmSignOut,
  PrepareSignOut,
} from '@/domain/usecases/auth/sign-out';
import { SignUp } from '@/domain/usecases/auth/sign-up';
import { StartAsGuest } from '@/domain/usecases/auth/start-as-guest';
import { UpdateLoadSetting } from '@/domain/usecases/profile/update-load-setting';
import { UpdateProfile } from '@/domain/usecases/profile/update-profile';
import { createAppStore, type AppStore } from '@/presentation/state/app-store';
import { workout as workoutText } from '@/presentation/strings/workout';
import type {
  AuthUseCases,
  ExercisesUseCases,
  OnboardingUseCases,
  ProfileUseCases,
  ProgressUseCases,
  RoutinesUseCases,
  StartupUseCases,
  SyncUseCases,
  UseCases,
  WorkoutUseCases,
} from '@/presentation/use-cases/use-cases-context';
import { createRestLiveActivity } from '@/presentation/widgets/rest-live-activity';

export interface Dependencies {
  useCases: UseCases;
  appStore: AppStore;
}

/** What the repositories run on: the app's expo-sqlite database, or a test one. */
export interface Storage {
  localDatabase: PreparedLocalDatabase;
  changes: TableChanges;
}

/** The app's storage: `onerm.db`, with the bundled catalog loaded on the first run (RF-CAT-03). */
export function appStorage(): Storage {
  return {
    localDatabase: new SqliteLocalDatabase(expoSqliteDriver, (db) =>
      loadCatalogSnapshot(db, CATALOG_SNAPSHOT),
    ),
    changes: expoTableChanges,
  };
}

/** What the rest notice and countdown run on: the phone, or fakes in a test. */
export interface Device {
  notifier: RestNotifier;
  countdown: RestCountdown;
  permissions: DevicePermissions;
}

/**
 * The phone: expo-notifications and the exact alarm module (RN-ENT-07, spike #14), and the
 * countdown on the lock screen (#305).
 */
export function appDevice(): Device {
  silenceRestNoticeInForeground();
  return {
    notifier: new ExpoRestNotifier(workoutText.rest.title),
    // An ongoing notification on Android, a Live Activity on iOS.
    countdown:
      Platform.OS === 'ios'
        ? new LiveActivityRestCountdown(
            createRestLiveActivity(),
            {
              title: workoutText.restCountdown.title,
              finished: workoutText.restCountdown.finished,
            },
            () => new Date(),
          )
        : new NotificationRestCountdown(
            workoutText.restCountdown.title,
            workoutText.restCountdown.channel,
          ),
    permissions: new ExpoDevicePermissions(),
  };
}

/**
 * What the factories of each group get. Every repository, the sync scheduler and `stopRest` exist
 * once and are shared: the backup status hears every sync (RN-SYNC-06), and finishing or
 * discarding a workout stops the same rest as «Saltear descanso».
 */
type Wiring = Repositories & {
  localDatabase: PreparedLocalDatabase;
  newId: () => Id;
  now: () => Date;
  notifier: RestNotifier;
  countdown: RestCountdown;
  permissions: DevicePermissions;
  auth: AuthGateway;
  backup: Backup;
  syncScheduler: SyncScheduler;
  stopRest: SkipRest;
};

type Repositories = ReturnType<typeof createRepositories>;

/** The repositories on SQLite. They get the database lazily: it opens in `prepareLocalData`. */
function createRepositories(db: () => AppDatabase, changes: TableChanges) {
  return {
    exerciseRepository: new SqliteExerciseRepository(db, changes),
    workoutRepository: new SqliteWorkoutRepository(db, changes, Date.now),
    routineRepository: new SqliteRoutineRepository(db, changes, Date.now),
    templateRepository: new SqliteRoutineTemplateRepository(db, changes),
    profileRepository: new SqliteProfileRepository(db, changes, Date.now),
    onboardingRepository: new SqliteOnboardingRepository(db, changes),
    accountRepository: new SqliteAccountRepository(db),
    restTimerRepository: new SqliteRestTimerRepository(db, changes),
    syncState: new SqliteSyncStateRepository(db, changes),
  };
}

/**
 * Composition root (ADR-0011 §4): the only place that creates implementations from `data` and
 * hands them to the use cases. Swapping a repository only touches this file. The repositories
 * get the database lazily: it opens in `prepareLocalData`, before any screen mounts (StartupGate).
 */
export function createDependencies(
  { localDatabase, changes }: Storage = appStorage(),
  // Client-side UUIDs, so records are created offline (RN-SYNC-02).
  newId: () => Id = randomUUID,
  { notifier, countdown, permissions }: Device = appDevice(),
  auth: AuthGateway = appAuth(),
  backup: Backup = appBackup({ localDatabase, changes }),
): Dependencies {
  const repositories = createRepositories(() => localDatabase.database, changes);
  const wiring: Wiring = {
    ...repositories,
    localDatabase,
    newId,
    now: () => new Date(),
    notifier,
    countdown,
    permissions,
    auth,
    backup,
    stopRest: new SkipRest(repositories.restTimerRepository, notifier, countdown),
    syncScheduler: new SyncScheduler(backup.engine, () => backup.countUploadable()),
  };

  return {
    useCases: {
      ...authUseCases(wiring),
      ...onboardingUseCases(wiring),
      ...startupUseCases(wiring),
      ...routinesUseCases(wiring),
      ...workoutUseCases(wiring),
      ...progressUseCases(wiring),
      ...exercisesUseCases(wiring),
      ...profileUseCases(wiring),
      ...syncUseCases(wiring),
    },
    appStore: createAppStore(),
  };
}

function authUseCases({
  now,
  auth,
  backup,
  syncScheduler,
  profileRepository,
  onboardingRepository,
  accountRepository,
  syncState,
}: Wiring): AuthUseCases {
  return {
    startAsGuest: new StartAsGuest(profileRepository, onboardingRepository),
    readAccount: new ReadAccount(auth, accountRepository),
    observeSessionLoss: new ObserveSessionLoss(auth, accountRepository),
    readAccountNudge: new ReadAccountNudge(accountRepository, now),
    answerAccountNudge: new AnswerAccountNudge(accountRepository, now),
    continueAfterAuth: new ContinueAfterAuth(profileRepository, onboardingRepository, syncState),
    signUp: new SignUp(auth, accountRepository),
    signIn: new SignIn(auth, accountRepository),
    continueWithGoogle: new ContinueWithGoogle(auth, accountRepository),
    requestPasswordReset: new RequestPasswordReset(auth),
    openRecoveryLink: new OpenRecoveryLink(auth, accountRepository),
    completePasswordRecovery: new CompletePasswordRecovery(auth, accountRepository),
    prepareSignOut: new PrepareSignOut(accountRepository),
    backUpBeforeSignOut: new BackUpBeforeSignOut(syncScheduler, accountRepository),
    confirmSignOut: new ConfirmSignOut(auth, accountRepository, syncScheduler),
    readPendingUnion: new ReadPendingUnion(auth, accountRepository),
    startGuestUnion: new StartGuestUnion(backup.union),
    finishGuestUnion: new FinishGuestUnion(backup.union),
    cancelGuestUnion: new CancelGuestUnion(auth, accountRepository),
  };
}

function onboardingUseCases({
  now,
  templateRepository,
  profileRepository,
  onboardingRepository,
}: Wiring): OnboardingUseCases {
  return {
    answerOnboarding: new AnswerOnboarding(profileRepository, onboardingRepository),
    observeRecommendation: new ObserveRecommendation(templateRepository, profileRepository),
    finishOnboarding: new FinishOnboarding(profileRepository, onboardingRepository, now),
  };
}

function startupUseCases({
  localDatabase,
  profileRepository,
  onboardingRepository,
  syncState,
}: Wiring): StartupUseCases {
  return {
    prepareLocalData: new PrepareLocalData(localDatabase),
    observeEntry: new ObserveEntry(profileRepository, onboardingRepository, syncState),
  };
}

function routinesUseCases({
  newId,
  now,
  exerciseRepository,
  workoutRepository,
  routineRepository,
  templateRepository,
  profileRepository,
}: Wiring): RoutinesUseCases {
  return {
    observeRoutines: new ObserveRoutines(
      routineRepository,
      templateRepository,
      profileRepository,
      workoutRepository,
    ),
    observeTemplate: new ObserveTemplate(
      templateRepository,
      profileRepository,
      routineRepository,
      workoutRepository,
      exerciseRepository,
    ),
    observeNextDay: new ObserveNextDay(
      profileRepository,
      routineRepository,
      workoutRepository,
      exerciseRepository,
      now,
      deviceLocalDate,
    ),
    adoptTemplate: new AdoptTemplate(
      templateRepository,
      routineRepository,
      profileRepository,
      workoutRepository,
      newId,
    ),
    activateRoutine: new ActivateRoutine(profileRepository, workoutRepository),
    deleteRoutine: new DeleteRoutine(routineRepository, profileRepository, workoutRepository),
    adjustActiveRoutine: new AdjustActiveRoutine(profileRepository, routineRepository),
    loadRoutineDraft: new LoadRoutineDraft(
      routineRepository,
      exerciseRepository,
      profileRepository,
      workoutRepository,
      newId,
    ),
    editRoutineDraft: new EditRoutineDraft(newId),
    saveRoutine: new SaveRoutine(routineRepository),
  };
}

function workoutUseCases({
  newId,
  now,
  notifier,
  countdown,
  permissions,
  stopRest,
  exerciseRepository,
  workoutRepository,
  routineRepository,
  profileRepository,
  restTimerRepository,
}: Wiring): WorkoutUseCases {
  const rest = [restTimerRepository, notifier, countdown, permissions, now] as const;
  return {
    observeWorkout: new ObserveWorkout(
      profileRepository,
      routineRepository,
      workoutRepository,
      exerciseRepository,
      deviceLocalDate,
    ),
    observeWorkoutInProgress: new ObserveWorkoutInProgress(workoutRepository),
    startWorkout: new StartWorkout(
      profileRepository,
      routineRepository,
      workoutRepository,
      exerciseRepository,
      newId,
      now,
    ),
    logSet: new LogSet(workoutRepository, newId, now),
    updateSet: new UpdateSet(workoutRepository),
    deleteSet: new DeleteSet(workoutRepository),
    restoreSet: new RestoreSet(workoutRepository, newId),
    observeRestTimer: new ObserveRestTimer(restTimerRepository),
    startRest: new StartRest(...rest),
    addRestTime: new AddRestTime(...rest),
    rescheduleRest: new RescheduleRest(...rest),
    skipRest: stopRest,
    askRestPermission: new AskRestPermission(restTimerRepository, permissions),
    readRestPermissions: new ReadRestPermissions(restTimerRepository, permissions),
    substituteExercise: new SubstituteExercise(workoutRepository, newId),
    finishWorkout: new FinishWorkout(workoutRepository, stopRest, now),
    discardWorkout: new DiscardWorkout(workoutRepository, stopRest),
    readWorkoutResume: new ReadWorkoutResume(workoutRepository, now),
    observeWorkoutSummary: new ObserveWorkoutSummary(
      profileRepository,
      routineRepository,
      workoutRepository,
      exerciseRepository,
      now,
      deviceLocalDate,
    ),
  };
}

function progressUseCases({
  newId,
  now,
  exerciseRepository,
  workoutRepository,
  profileRepository,
  syncState,
}: Wiring): ProgressUseCases {
  return {
    observeHistory: new ObserveHistory(workoutRepository, syncState),
    observeWorkoutDetail: new ObserveWorkoutDetail(
      profileRepository,
      workoutRepository,
      exerciseRepository,
    ),
    updatePastSet: new UpdatePastSet(workoutRepository),
    addPastSet: new AddPastSet(workoutRepository, newId),
    deletePastSet: new DeletePastSet(workoutRepository),
    deleteWorkout: new DeleteWorkout(workoutRepository),
    observeExerciseProgress: new ObserveExerciseProgress(
      profileRepository,
      workoutRepository,
      exerciseRepository,
      now,
      deviceLocalDate,
    ),
    observeWeeklyVolume: new ObserveWeeklyVolume(
      profileRepository,
      workoutRepository,
      exerciseRepository,
      now,
      deviceLocalDate,
    ),
  };
}

function exercisesUseCases({ exerciseRepository, workoutRepository }: Wiring): ExercisesUseCases {
  return {
    observeExercises: new ObserveExercises(exerciseRepository),
    observeExerciseDetail: new ObserveExerciseDetail(exerciseRepository, workoutRepository),
  };
}

function profileUseCases({ routineRepository, profileRepository }: Wiring): ProfileUseCases {
  return {
    observeProfile: new ObserveProfile(profileRepository),
    updateProfile: new UpdateProfile(profileRepository, routineRepository),
    updateLoadSetting: new UpdateLoadSetting(profileRepository),
  };
}

function syncUseCases({
  backup,
  syncScheduler,
  workoutRepository,
  syncState,
}: Wiring): SyncUseCases {
  return {
    keepBackedUp: new KeepBackedUp(syncScheduler, backup.triggers),
    observeSyncStatus: new ObserveSyncStatus(syncState, workoutRepository, syncScheduler),
    observeBackupNotice: new ObserveBackupNotice(syncState, syncScheduler),
    observeRestoration: new ObserveRestoration(syncScheduler),
    observeSyncActivity: new ObserveSyncActivity(syncScheduler),
    syncNow: new SyncNow(syncScheduler),
    observeRejectedChanges: new ObserveRejectedChanges(backup.rejected),
    discardRejectedChange: new DiscardRejectedChange(backup.rejected),
    retryRejectedChange: new RetryRejectedChange(backup.rejected, syncScheduler),
  };
}
