import { CATALOG_SNAPSHOT } from '@/data/catalog/catalog-snapshot';
import { loadCatalogSnapshot } from '@/data/catalog/load-catalog-snapshot';
import { expoSqliteDriver, expoTableChanges } from '@/data/db/expo-sqlite-driver';
import { SqliteLocalDatabase, type PreparedLocalDatabase } from '@/data/db/sqlite-local-database';
import type { TableChanges } from '@/data/db/table-changes';
import { randomUUID } from 'expo-crypto';

import { SqliteExerciseRepository } from '@/data/repositories/sqlite-exercise-repository';
import { SqliteOnboardingRepository } from '@/data/repositories/sqlite-onboarding-repository';
import { SqliteProfileRepository } from '@/data/repositories/sqlite-profile-repository';
import { SqliteRoutineRepository } from '@/data/repositories/sqlite-routine-repository';
import { SqliteRoutineTemplateRepository } from '@/data/repositories/sqlite-routine-template-repository';
import { SqliteWorkoutRepository } from '@/data/repositories/sqlite-workout-repository';
import type { Id } from '@/domain/models/vocabulary';
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
import { ObserveProfile } from '@/domain/usecases/observe-profile';
import { ObserveRecommendation } from '@/domain/usecases/observe-recommendation';
import { ObserveRoutines } from '@/domain/usecases/observe-routines';
import { ObserveTemplate } from '@/domain/usecases/observe-template';
import { PrepareLocalData } from '@/domain/usecases/prepare-local-data';
import { StartAsGuest } from '@/domain/usecases/start-as-guest';
import { UpdateProfile } from '@/domain/usecases/update-profile';
import { createAppStore, type AppStore } from '@/presentation/state/app-store';
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

/**
 * Composition root (ADR-0011 §4): the only place that creates implementations from `data` and
 * hands them to the use cases. Swapping a repository only touches this file. The repositories
 * get the database lazily: it opens in `prepareLocalData`, before any screen mounts (StartupGate).
 */
export function createDependencies(
  { localDatabase, changes }: Storage = appStorage(),
  // Client-side UUIDs, so records are created offline (RN-SYNC-02).
  newId: () => Id = randomUUID,
): Dependencies {
  const db = () => localDatabase.database;
  const exerciseRepository = new SqliteExerciseRepository(db, changes);
  const workoutRepository = new SqliteWorkoutRepository(db, changes, Date.now);
  const routineRepository = new SqliteRoutineRepository(db, changes, Date.now);
  const templateRepository = new SqliteRoutineTemplateRepository(db, changes);
  const profileRepository = new SqliteProfileRepository(db, changes, Date.now);
  const onboardingRepository = new SqliteOnboardingRepository(db, changes);

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
      finishOnboarding: new FinishOnboarding(
        profileRepository,
        onboardingRepository,
        () => new Date(),
      ),
    },
    appStore: createAppStore(),
  };
}
