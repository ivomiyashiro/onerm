import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Exercise } from '@/domain/models/exercise';
import type { ExerciseRepository } from '@/domain/repositories/exercise-repository';
import type { Observer } from '@/domain/repositories/observer';
import { anExercise } from '@/domain/testing/builders';
import { ObserveExercises } from '@/domain/usecases/observe-exercises';
import { PrepareLocalData } from '@/domain/usecases/prepare-local-data';
import { useExerciseListViewModel } from '@/presentation/features/exercises/use-exercise-list-view-model';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

const SQUAT: Exercise = anExercise({ id: 'squat', name: 'Sentadilla con barra' });

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
  return renderHook(() => useExerciseListViewModel(), { wrapper });
}

describe('useExerciseListViewModel', () => {
  it('is loading until the first value arrives', async () => {
    const { repository } = fakeRepository();

    const { result } = await renderViewModel(repository);

    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('shows the exercises as content', async () => {
    const fake = fakeRepository();
    const { result } = await renderViewModel(fake.repository);

    await act(() => fake.emit([SQUAT]));

    expect(result.current.state).toEqual({ status: 'content', exercises: [SQUAT] });
  });

  it('is empty when there are no exercises', async () => {
    const fake = fakeRepository();
    const { result } = await renderViewModel(fake.repository);

    await act(() => fake.emit([]));

    expect(result.current.state).toEqual({ status: 'empty' });
  });

  it('follows later changes of the observed data', async () => {
    const fake = fakeRepository();
    const { result } = await renderViewModel(fake.repository);
    await act(() => fake.emit([SQUAT]));

    await act(() => fake.emit([]));

    expect(result.current.state).toEqual({ status: 'empty' });
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
