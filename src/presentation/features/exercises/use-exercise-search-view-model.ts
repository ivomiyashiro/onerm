import { useEffect, useMemo, useState } from 'react';

import type { Exercise } from '@/domain/models/exercise';
import type { Equipment, Muscle } from '@/domain/models/vocabulary';
import { searchExercises, type CatalogSearch } from '@/domain/rules/catalog-search';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export type ExerciseSearchState =
  | { status: 'loading' }
  | { status: 'content'; exercises: Exercise[] }
  | { status: 'noResults' }
  | { status: 'error' };

export interface ExerciseSearchViewModel {
  state: ExerciseSearchState;
  /** What the search field and the chips show. */
  search: CatalogSearch;
  actions: {
    setQuery(query: string): void;
    toggleMuscle(muscle: Muscle): void;
    toggleEquipment(equipment: Equipment): void;
    /** RF-CAT-01 AC4: empties the text and the filters. */
    clearFilters(): void;
    retry(): void;
  };
}

type CatalogState =
  { status: 'loading' } | { status: 'loaded'; exercises: Exercise[] } | { status: 'error' };

const EMPTY_SEARCH: CatalogSearch = { query: '', muscles: [], equipment: [] };

function toggle<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

/**
 * S16 · Buscador (RF-CAT-01). Observes the local catalog, so it works the same without a
 * connection (AC6), and filters it in memory on every change of the search (AC1: no network,
 * well under 200 ms for the catalog size).
 */
export function useExerciseSearchViewModel(): ExerciseSearchViewModel {
  const { observeExercises } = useUseCases();
  const [catalog, setCatalog] = useState<CatalogState>({ status: 'loading' });
  const [search, setSearch] = useState<CatalogSearch>(EMPTY_SEARCH);
  // Changing it re-runs the effect, which subscribes again.
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      observeExercises.execute({
        next: (exercises) => setCatalog({ status: 'loaded', exercises }),
        error: () => setCatalog({ status: 'error' }),
      }),
    [observeExercises, attempt],
  );

  const state = useMemo<ExerciseSearchState>(() => {
    if (catalog.status !== 'loaded') return catalog;
    const exercises = searchExercises(catalog.exercises, search);
    return exercises.length === 0 ? { status: 'noResults' } : { status: 'content', exercises };
  }, [catalog, search]);

  return {
    state,
    search,
    actions: {
      setQuery: (query) => setSearch((s) => ({ ...s, query })),
      toggleMuscle: (muscle) => setSearch((s) => ({ ...s, muscles: toggle(s.muscles, muscle) })),
      toggleEquipment: (equipment) =>
        setSearch((s) => ({ ...s, equipment: toggle(s.equipment, equipment) })),
      clearFilters: () => setSearch(EMPTY_SEARCH),
      retry: () => {
        setCatalog({ status: 'loading' });
        setAttempt((n) => n + 1);
      },
    },
  };
}
