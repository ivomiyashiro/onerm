import { deviceLocalDate } from '@/data/calendar/device-local-date';
import { CATALOG_SNAPSHOT } from '@/data/catalog/catalog-snapshot';
import { loadCatalogSnapshot } from '@/data/catalog/load-catalog-snapshot';
import { expoSqliteDriver, expoTableChanges } from '@/data/db/expo-sqlite-driver';
import { SqliteLocalDatabase, type PreparedLocalDatabase } from '@/data/db/sqlite-local-database';
import type { TableChanges } from '@/data/db/table-changes';
import { ExpoDevicePermissions } from '@/data/device/expo-device-permissions';
import { ExpoRestNotifier, silenceRestNoticeInForeground } from '@/data/device/expo-rest-notifier';
import { LiveActivityRestCountdown } from '@/data/device/live-activity-rest-countdown';
import { NotificationRestCountdown } from '@/data/device/notification-rest-countdown';
import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import { randomUUID } from 'expo-crypto';
import { AppState, Platform } from 'react-native';

import {
  createSupabaseAuth,
  UnconfiguredAuthGateway,
  type SupabaseAuth,
} from '@/data/auth/create-supabase-auth';
import { expoSessionStorage } from '@/data/auth/expo-session-storage';
import { NativeGoogleAccountPicker } from '@/data/auth/google-account-picker';
import { SqliteAccountRepository } from '@/data/repositories/sqlite-account-repository';

import { SqliteExerciseRepository } from '@/data/repositories/sqlite-exercise-repository';
import { SqliteOnboardingRepository } from '@/data/repositories/sqlite-onboarding-repository';
import { SqliteProfileRepository } from '@/data/repositories/sqlite-profile-repository';
import { SqliteRestTimerRepository } from '@/data/repositories/sqlite-rest-timer-repository';
import { SqliteRoutineRepository } from '@/data/repositories/sqlite-routine-repository';
import { SqliteRoutineTemplateRepository } from '@/data/repositories/sqlite-routine-template-repository';
import { SqliteWorkoutRepository } from '@/data/repositories/sqlite-workout-repository';
import { DeviceSyncTriggers } from '@/data/sync/device-sync-triggers';
import { SqliteGuestUnion } from '@/data/sync/sqlite-guest-union';
import { SqliteRejectedChangeRepository } from '@/data/sync/sqlite-rejected-change-repository';
import { SqliteSyncStateRepository } from '@/data/sync/sqlite-sync-state-repository';
import { SupabaseSyncEngine } from '@/data/sync/supabase-sync-engine';
import type { Id } from '@/domain/models/vocabulary';
import type { AuthGateway } from '@/domain/repositories/auth-gateway';
import type { DevicePermissions } from '@/domain/repositories/device-permissions';
import type { RestCountdown } from '@/domain/repositories/rest-countdown';
import type { RestNotifier } from '@/domain/repositories/rest-notifier';
import type { SyncEngine } from '@/domain/repositories/sync-engine';
import type { SyncTriggers } from '@/domain/repositories/sync-triggers';
import { KeepBackedUp } from '@/domain/usecases/keep-backed-up';
import {
  CancelGuestUnion,
  FinishGuestUnion,
  ReadPendingUnion,
  StartGuestUnion,
} from '@/domain/usecases/guest-union';
import type { GuestUnion } from '@/domain/repositories/guest-union';
import { ObserveBackupNotice } from '@/domain/usecases/observe-backup-notice';
import { ObserveRestoration } from '@/domain/usecases/observe-restoration';
import { ObserveSyncActivity } from '@/domain/usecases/observe-sync-activity';
import { ObserveSyncStatus } from '@/domain/usecases/observe-sync-status';
import { SyncNow } from '@/domain/usecases/sync-now';
import {
  DiscardRejectedChange,
  ObserveRejectedChanges,
  RetryRejectedChange,
} from '@/domain/usecases/rejected-changes';
import type { RejectedChangeRepository } from '@/domain/repositories/rejected-change-repository';
import { SyncScheduler } from '@/domain/usecases/sync-scheduler';
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
  SubstituteExercise,
} from '@/domain/usecases/workout-lifecycle';
import { DeleteSet, LogSet, RestoreSet, UpdateSet } from '@/domain/usecases/workout-sets';
import { ObserveProfile } from '@/domain/usecases/observe-profile';
import { ObserveRecommendation } from '@/domain/usecases/observe-recommendation';
import { ObserveRoutines } from '@/domain/usecases/observe-routines';
import { ObserveTemplate } from '@/domain/usecases/observe-template';
import { EditRoutineDraft, LoadRoutineDraft, SaveRoutine } from '@/domain/usecases/routine-draft';
import { PrepareLocalData } from '@/domain/usecases/prepare-local-data';
import { AnswerAccountNudge, ReadAccountNudge } from '@/domain/usecases/account-nudge';
import { ObserveSessionLoss } from '@/domain/usecases/observe-session-loss';
import { ContinueAfterAuth } from '@/domain/usecases/continue-after-auth';
import { ReadAccount } from '@/domain/usecases/read-account';
import { CompletePasswordRecovery } from '@/domain/usecases/complete-password-recovery';
import { OpenRecoveryLink } from '@/domain/usecases/open-recovery-link';
import { RequestPasswordReset } from '@/domain/usecases/request-password-reset';
import { ContinueWithGoogle } from '@/domain/usecases/continue-with-google';
import { SignIn } from '@/domain/usecases/sign-in';
import { BackUpBeforeSignOut, ConfirmSignOut, PrepareSignOut } from '@/domain/usecases/sign-out';
import { SignUp } from '@/domain/usecases/sign-up';
import { StartAsGuest } from '@/domain/usecases/start-as-guest';
import { UpdateLoadSetting } from '@/domain/usecases/update-load-setting';
import { UpdateProfile } from '@/domain/usecases/update-profile';
import { createAppStore, type AppStore } from '@/presentation/state/app-store';
import { workout as workoutText } from '@/presentation/strings/workout';
import type { UseCases } from '@/presentation/use-cases/use-cases-context';
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
            { title: workoutText.restCountdown.title, finished: workoutText.rest.finished },
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
 * Supabase Auth with the session sealed in the Keystore (RNF-07). The server comes from the build's
 * public variables; without them nothing can sign in. The token only refreshes with the app in
 * the foreground, as supabase-js recommends for React Native (spike #15).
 */
export function appAuth(): AuthGateway {
  return appSupabase()?.gateway ?? new UnconfiguredAuthGateway();
}

/** One supabase-js client for auth and sync (spike #15), or null without a server configured. */
function appSupabase(): SupabaseAuth | null {
  if (cachedSupabase === undefined) cachedSupabase = createAppSupabase();
  return cachedSupabase;
}

let cachedSupabase: SupabaseAuth | null | undefined;

/**
 * The WEB client of Google (spike #16): public by design, it goes inside the app. It is also the
 * `client_id` of the Google provider in Supabase.
 */
const GOOGLE_WEB_CLIENT_ID =
  '190800915067-rcghu8e9tmhjam3mrqra4g5mbdbibb3s.apps.googleusercontent.com';

/**
 * iOS needs its own Google client (ADR-0012), and without it `configure` throws at startup (#49).
 * Until one is created, iOS has no Google picker: «Continuar con Google» fails like an error.
 */
function googlePicker(): NativeGoogleAccountPicker | undefined {
  if (Platform.OS !== 'ios')
    return new NativeGoogleAccountPicker({ webClientId: GOOGLE_WEB_CLIENT_ID });
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  return iosClientId
    ? new NativeGoogleAccountPicker({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId })
    : undefined;
}

/** The server has to be reached over https (RNF-09); plain http only for the dev machine. */
const LOCAL_HOST = /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:|\/|$)/;

function createAppSupabase(): SupabaseAuth | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  if (!url.startsWith('https://') && !LOCAL_HOST.test(url)) return null;

  const supabase = createSupabaseAuth({
    url,
    publishableKey,
    storage: expoSessionStorage,
    google: googlePicker(),
  });
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.client.auth.startAutoRefresh();
    else supabase.client.auth.stopAutoRefresh();
  });
  return supabase;
}

/** The automatic backup (RF-SYNC-01): the engine, what it would upload, and its triggers. */
export interface Backup {
  engine: SyncEngine;
  countUploadable(): Promise<number>;
  triggers: SyncTriggers;
  rejected: RejectedChangeRepository;
  union: GuestUnion;
}

/**
 * The sync of 07 §4.1 against the configured server, triggered by the phone (RN-SYNC-06). Without
 * a server there is nothing to back up to, like a guest's device.
 */
export function appBackup({ localDatabase, changes }: Storage): Backup {
  const client = appSupabase()?.client;
  // Only `isConnected` is used: NetInfo's reachability check would poll a URL every minute,
  // also in the background (RNF-22, #180).
  NetInfo.configure({ reachabilityShouldRun: () => false });
  const triggers = new DeviceSyncTriggers(changes, AppState, NetInfo);
  const rejected = new SqliteRejectedChangeRepository(
    () => localDatabase.database,
    changes,
    client ?? null,
  );
  const union = new SqliteGuestUnion(() => localDatabase.database, client ?? null);
  if (client === undefined) {
    return {
      engine: { sync: async () => 'guest' },
      countUploadable: async () => 0,
      triggers,
      rejected,
      union,
    };
  }
  const engine = new SupabaseSyncEngine(
    () => localDatabase.database,
    client,
    Constants.expoConfig?.version ?? '0.0.0',
  );
  return {
    engine,
    countUploadable: () => engine.countUploadable(),
    triggers,
    rejected,
    union,
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
  const db = () => localDatabase.database;
  const now = () => new Date();
  const exerciseRepository = new SqliteExerciseRepository(db, changes);
  const workoutRepository = new SqliteWorkoutRepository(db, changes, Date.now);
  const routineRepository = new SqliteRoutineRepository(db, changes, Date.now);
  const templateRepository = new SqliteRoutineTemplateRepository(db, changes);
  const profileRepository = new SqliteProfileRepository(db, changes, Date.now);
  const onboardingRepository = new SqliteOnboardingRepository(db, changes);
  const accountRepository = new SqliteAccountRepository(db);
  const restTimerRepository = new SqliteRestTimerRepository(db, changes);
  const rest = [restTimerRepository, notifier, countdown, permissions, now] as const;
  const stopRest = new SkipRest(restTimerRepository, notifier, countdown);
  const syncState = new SqliteSyncStateRepository(db, changes);
  const syncScheduler = new SyncScheduler(backup.engine, () => backup.countUploadable());

  return {
    useCases: {
      observeExercises: new ObserveExercises(exerciseRepository),
      observeExerciseDetail: new ObserveExerciseDetail(exerciseRepository, workoutRepository),
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
      prepareLocalData: new PrepareLocalData(localDatabase),
      observeEntry: new ObserveEntry(profileRepository, onboardingRepository, syncState),
      startAsGuest: new StartAsGuest(profileRepository, onboardingRepository),
      answerOnboarding: new AnswerOnboarding(profileRepository, onboardingRepository),
      observeRecommendation: new ObserveRecommendation(templateRepository, profileRepository),
      observeProfile: new ObserveProfile(profileRepository),
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
      keepBackedUp: new KeepBackedUp(syncScheduler, backup.triggers),
      readPendingUnion: new ReadPendingUnion(auth, accountRepository),
      startGuestUnion: new StartGuestUnion(backup.union),
      finishGuestUnion: new FinishGuestUnion(backup.union),
      cancelGuestUnion: new CancelGuestUnion(auth, accountRepository),
      observeSyncStatus: new ObserveSyncStatus(syncState, workoutRepository, syncScheduler),
      observeBackupNotice: new ObserveBackupNotice(syncState, syncScheduler),
      observeRestoration: new ObserveRestoration(syncScheduler),
      observeSyncActivity: new ObserveSyncActivity(syncScheduler),
      syncNow: new SyncNow(syncScheduler),
      observeRejectedChanges: new ObserveRejectedChanges(backup.rejected),
      discardRejectedChange: new DiscardRejectedChange(backup.rejected),
      retryRejectedChange: new RetryRejectedChange(backup.rejected, syncScheduler),
      updateProfile: new UpdateProfile(profileRepository, routineRepository),
      adjustActiveRoutine: new AdjustActiveRoutine(profileRepository, routineRepository),
      updateLoadSetting: new UpdateLoadSetting(profileRepository),
      finishOnboarding: new FinishOnboarding(profileRepository, onboardingRepository, now),
      loadRoutineDraft: new LoadRoutineDraft(
        routineRepository,
        exerciseRepository,
        profileRepository,
        workoutRepository,
        newId,
      ),
      editRoutineDraft: new EditRoutineDraft(newId),
      saveRoutine: new SaveRoutine(routineRepository),
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
    },
    appStore: createAppStore(),
  };
}
