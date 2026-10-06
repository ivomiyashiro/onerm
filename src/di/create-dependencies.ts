import { CATALOG_SNAPSHOT } from '@/data/catalog/catalog-snapshot';
import { loadCatalogSnapshot } from '@/data/catalog/load-catalog-snapshot';
import { expoSqliteDriver } from '@/data/db/expo-sqlite-driver';
import { SqliteLocalDatabase } from '@/data/db/sqlite-local-database';
import { InMemoryExerciseRepository } from '@/data/repositories/in-memory-exercise-repository';
import type { Exercise } from '@/domain/models/exercise';
import type { LocalDatabase } from '@/domain/repositories/local-database';
import { ObserveExercises } from '@/domain/usecases/observe-exercises';
import { PrepareLocalData } from '@/domain/usecases/prepare-local-data';
import { createAppStore, type AppStore } from '@/presentation/state/app-store';
import type { UseCases } from '@/presentation/use-cases/use-cases-context';

export interface Dependencies {
  useCases: UseCases;
  appStore: AppStore;
}

// Example data until the bundled catalog (#28) and the SQLite repository (#29).
const EXAMPLE_EXERCISES: Exercise[] = [
  {
    id: 'barbell-back-squat',
    slug: 'sentadilla-barra',
    name: 'Sentadilla con barra',
    aliases: [],
    loadType: 'external',
    primaryMuscles: ['quads'],
    secondaryMuscles: ['glutes'],
    primaryEquipment: 'barbell',
    equipment: ['barbell'],
    mechanic: 'compound',
    isUnilateral: false,
    description: null,
    attributions: [],
    deprecatedAt: null,
  },
  {
    id: 'barbell-bench-press',
    slug: 'press-banca-barra',
    name: 'Press de banca con barra',
    aliases: [],
    loadType: 'external',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'shoulders'],
    primaryEquipment: 'barbell',
    equipment: ['barbell'],
    mechanic: 'compound',
    isUnilateral: false,
    description: null,
    attributions: [],
    deprecatedAt: null,
  },
];

/**
 * Composition root (ADR-0011 §4): the only place that creates implementations from `data` and
 * hands them to the use cases. Swapping a repository only touches this file.
 */
export function createDependencies(
  localDatabase: LocalDatabase = new SqliteLocalDatabase(expoSqliteDriver, (db) =>
    loadCatalogSnapshot(db, CATALOG_SNAPSHOT),
  ),
): Dependencies {
  const exerciseRepository = new InMemoryExerciseRepository(EXAMPLE_EXERCISES);

  return {
    useCases: {
      observeExercises: new ObserveExercises(exerciseRepository),
      prepareLocalData: new PrepareLocalData(localDatabase),
    },
    appStore: createAppStore(),
  };
}
