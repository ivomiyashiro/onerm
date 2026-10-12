import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Exercise } from '@/domain/models/exercise';
import type { ExerciseRepository } from '@/domain/repositories/exercise-repository';
import type { Observer } from '@/domain/repositories/observer';
import { anExercise } from '@/domain/testing/builders';
import { ObserveExercises } from '@/domain/usecases/observe-exercises';
import { PrepareLocalData } from '@/domain/usecases/prepare-local-data';
import { useExerciseSearchViewModel } from '@/presentation/features/exercises/use-exercise-search-view-model';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

const SQUAT: Exercise = anExercise({
  id: 'squat',
  name: 'Sentadilla con barra',
  primaryMuscles: ['quads'],
  equipment: ['barbell'],
});
const ROW: Exercise = anExercise({
  id: 'row',
  name: 'Remo con mancuerna',
  primaryMuscles: ['back'],
  equipment: ['dumbbell'],
});

/** Fake repository: the test decides when and what it emits. */
function fakeRepository() {
  const observers = new Set<Observer<Exercise[]>>();
  const repository: ExerciseRepository = {
    observeAll(observer) {
      observers.add(observer);
      return () => observers.delete(observer);
    },
  };
  return {
    repository,
    observerCount: () => observers.size,
    emit: (exercises: Exercise[]) => observers.forEach((o) => o.next(exercises)),
    // An error ends the observation (Observer contract): the observers are dropped.
    fail: () => {
      observers.forEach((o) => o.error(new Error('disk I/O error')));
      observers.clear();
    },
  };
}

async function renderViewModel(repository: ExerciseRepository) {
  const useCases = {
    observeExercises: new ObserveExercises(repository),
    prepareLocalData: new PrepareLocalData({ prepare: async () => {} }),
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <UseCasesProvider useCases={useCases}>{children}</UseCasesProvider>
  );
  return renderHook(() => useExerciseSearchViewModel(), { wrapper });
}

async function withCatalog(exercises: Exercise[]) {
  const fake = fakeRepository();
  const rendered = await renderViewModel(fake.repository);
  await act(() => fake.emit(exercises));
  return { fake, ...rendered };
}

describe('useExerciseSearchViewModel', () => {
  it('is loading until the catalog arrives, with an empty search', async () => {
    const { repository } = fakeRepository();

    const { result } = await renderViewModel(repository);

    expect(result.current.state).toEqual({ status: 'loading' });
    expect(result.current.search).toEqual({ query: '', muscles: [], equipment: [] });
  });

  it('without a search shows the whole catalog by name', async () => {
    const { result } = await withCatalog([SQUAT, ROW]);

    expect(result.current.state).toEqual({ status: 'content', exercises: [ROW, SQUAT] });
  });

  it('RF-CAT-01.AC1: typing narrows the results', async () => {
    const { result } = await withCatalog([SQUAT, ROW]);

    await act(() => result.current.actions.setQuery('sentadilla'));

    expect(result.current.search.query).toBe('sentadilla');
    expect(result.current.state).toEqual({ status: 'content', exercises: [SQUAT] });
  });

  it('RF-CAT-01.AC3: toggling a filter adds it and removes it', async () => {
    const { result } = await withCatalog([SQUAT, ROW]);

    await act(() => result.current.actions.toggleMuscle('back'));
    expect(result.current.search.muscles).toEqual(['back']);
    expect(result.current.state).toEqual({ status: 'content', exercises: [ROW] });

    await act(() => result.current.actions.toggleMuscle('back'));
    expect(result.current.search.muscles).toEqual([]);
  });

  it('RF-CAT-01.AC3: equipment combines with the muscle', async () => {
    const { result } = await withCatalog([SQUAT, ROW]);

    await act(() => result.current.actions.toggleMuscle('back'));
    await act(() => result.current.actions.toggleEquipment('barbell'));

    expect(result.current.search.equipment).toEqual(['barbell']);
    expect(result.current.state).toEqual({ status: 'noResults' });
  });

  it('RF-CAT-01.AC4: no match is noResults, and clearFilters brings everything back', async () => {
    const { result } = await withCatalog([SQUAT, ROW]);
    await act(() => result.current.actions.setQuery('press francés'));
    await act(() => result.current.actions.toggleEquipment('cable'));
    expect(result.current.state).toEqual({ status: 'noResults' });

    await act(() => result.current.actions.clearFilters());

    expect(result.current.search).toEqual({ query: '', muscles: [], equipment: [] });
    expect(result.current.state).toEqual({ status: 'content', exercises: [ROW, SQUAT] });
  });

  it('keeps the search while the catalog changes', async () => {
    const { fake, result } = await withCatalog([SQUAT]);
    await act(() => result.current.actions.setQuery('remo'));

    await act(() => fake.emit([SQUAT, ROW]));

    expect(result.current.state).toEqual({ status: 'content', exercises: [ROW] });
  });

  it('shows an error when the observation fails', async () => {
    const fake = fakeRepository();
    const { result } = await renderViewModel(fake.repository);

    await act(() => fake.fail());

    expect(result.current.state).toEqual({ status: 'error' });
  });

  it('retry() subscribes again and goes back to loading', async () => {
    const fake = fakeRepository();
    const { result } = await renderViewModel(fake.repository);
    await act(() => fake.fail());

    await act(() => result.current.actions.retry());

    expect(result.current.state).toEqual({ status: 'loading' });
    await act(() => fake.emit([SQUAT]));
    expect(result.current.state).toEqual({ status: 'content', exercises: [SQUAT] });
    expect(fake.observerCount()).toBe(1);
  });

  it('unsubscribes on unmount', async () => {
    const fake = fakeRepository();
    const { unmount } = await renderViewModel(fake.repository);

    await unmount();

    expect(fake.observerCount()).toBe(0);
  });
});
