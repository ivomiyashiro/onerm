import { InMemoryExerciseRepository } from '@/data/repositories/in-memory-exercise-repository';
import type { Exercise } from '@/domain/models/exercise';
import { ObserveExercises } from '@/domain/usecases/observe-exercises';
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
export function createDependencies(): Dependencies {
  const exerciseRepository = new InMemoryExerciseRepository(EXAMPLE_EXERCISES);

  return {
    useCases: { observeExercises: new ObserveExercises(exerciseRepository) },
    appStore: createAppStore(),
  };
}
