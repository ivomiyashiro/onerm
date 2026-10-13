import { deviceLocalDate } from '@/data/calendar/device-local-date';
import { CATALOG_SNAPSHOT } from '@/data/catalog/catalog-snapshot';
import { loadCatalogSnapshot } from '@/data/catalog/load-catalog-snapshot';
import { expoSqliteDriver, expoTableChanges } from '@/data/db/expo-sqlite-driver';
import { SqliteLocalDatabase, type PreparedLocalDatabase } from '@/data/db/sqlite-local-database';
import type { TableChanges } from '@/data/db/table-changes';
import { ExpoDevicePermissions } from '@/data/device/expo-device-permissions';
import { ExpoRestNotifier, silenceRestNoticeInForeground } from '@/data/device/expo-rest-notifier';
import { randomUUID } from 'expo-crypto';

import { SqliteExerciseRepository } from '@/data/repositories/sqlite-exercise-repository';
import { SqliteOnboardingRepository } from '@/data/repositories/sqlite-onboarding-repository';
import { SqliteProfileRepository } from '@/data/repositories/sqlite-profile-repository';
import { SqliteRestTimerRepository } from '@/data/repositories/sqlite-rest-timer-repository';
import { SqliteRoutineRepository } from '@/data/repositories/sqlite-routine-repository';
import { SqliteRoutineTemplateRepository } from '@/data/repositories/sqlite-routine-template-repository';
import { SqliteWorkoutRepository } from '@/data/repositories/sqlite-workout-repository';
import type { Id } from '@/domain/models/vocabulary';
import type { DevicePermissions } from '@/domain/repositories/device-permissions';
import type { RestNotifier } from '@/domain/repositories/rest-notifier';
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
import { createAppStore, type AppStore } from '@/presentation/state/app-store';
import { workout as workoutText } from '@/presentation/strings/workout';
import type { UseCases } from '@/presentation/use-cases/use-cases-context';

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

/** What the rest notice runs on: the phone, or fakes in a test. */
export interface Device {
  notifier: RestNotifier;
  permissions: DevicePermissions;
}

/** The phone: expo-notifications and the exact alarm module (RN-ENT-07, spike #14). */
export function appDevice(): Device {
  silenceRestNoticeInForeground();
  return {
    notifier: new ExpoRestNotifier(workoutText.rest.title),
    permissions: new ExpoDevicePermissions(),
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
  { notifier, permissions }: Device = appDevice(),
): Dependencies {
  const db = () => localDatabase.database;
  const now = () => new Date();
  const exerciseRepository = new SqliteExerciseRepository(db, changes);
  const workoutRepository = new SqliteWorkoutRepository(db, changes, Date.now);
  const routineRepository = new SqliteRoutineRepository(db, changes, Date.now);
  const templateRepository = new SqliteRoutineTemplateRepository(db, changes);
  const profileRepository = new SqliteProfileRepository(db, changes, Date.now);
  const onboardingRepository = new SqliteOnboardingRepository(db, changes);
  const restTimerRepository = new SqliteRestTimerRepository(db, changes);
  const rest = [restTimerRepository, notifier, permissions, now] as const;

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
      observeEntry: new ObserveEntry(profileRepository, onboardingRepository),
      startAsGuest: new StartAsGuest(profileRepository, onboardingRepository),
      answerOnboarding: new AnswerOnboarding(profileRepository, onboardingRepository),
      observeRecommendation: new ObserveRecommendation(templateRepository, profileRepository),
      observeProfile: new ObserveProfile(profileRepository),
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
      skipRest: new SkipRest(restTimerRepository, notifier),
      askRestPermission: new AskRestPermission(restTimerRepository, permissions),
      readRestPermissions: new ReadRestPermissions(permissions),
    },
    appStore: createAppStore(),
  };
}
