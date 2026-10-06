import { CATALOG_SNAPSHOT } from '@/data/catalog/catalog-snapshot';
import { loadCatalogSnapshot } from '@/data/catalog/load-catalog-snapshot';
import { expoSqliteDriver, expoTableChanges } from '@/data/db/expo-sqlite-driver';
import { SqliteLocalDatabase, type PreparedLocalDatabase } from '@/data/db/sqlite-local-database';
import type { TableChanges } from '@/data/db/table-changes';
import { SqliteExerciseRepository } from '@/data/repositories/sqlite-exercise-repository';
import { ObserveExercises } from '@/domain/usecases/observe-exercises';
import { PrepareLocalData } from '@/domain/usecases/prepare-local-data';
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
): Dependencies {
  const db = () => localDatabase.database;
  const exerciseRepository = new SqliteExerciseRepository(db, changes);

  return {
    useCases: {
      observeExercises: new ObserveExercises(exerciseRepository),
      prepareLocalData: new PrepareLocalData(localDatabase),
    },
    appStore: createAppStore(),
  };
}
