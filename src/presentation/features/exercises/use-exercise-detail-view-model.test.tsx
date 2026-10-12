import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Observer } from '@/domain/repositories/observer';
import { anExercise } from '@/domain/testing/builders';
import type { Exercise } from '@/domain/models/exercise';
import { ObserveExerciseDetail } from '@/domain/usecases/observe-exercise-detail';
import { useExerciseDetailViewModel } from '@/presentation/features/exercises/use-exercise-detail-view-model';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

const SQUAT = anExercise({ id: 'squat' });

/** The real use case over fake repositories: the test decides what the catalog emits per id. */
function fakeDetail() {
  const observers = new Map<string, Observer<Exercise | null>>();
  const useCase = new ObserveExerciseDetail(
    {
      observeById(id, observer) {
        observers.set(id, observer);
        return () => observers.delete(id);
      },
    },
    {
      observeFinished(observer) {
        observer.next([]);
        return () => {};
      },
    },
  );
  return {
    useCase,
    ids: () => [...observers.keys()],
    emit: (id: string, value: Exercise | null) => observers.get(id)?.next(value),
    fail: (id: string) => {
      observers.get(id)?.error(new Error('disk'));
      observers.delete(id);
    },
  };
}

async function renderViewModel(fake: ReturnType<typeof fakeDetail>, id = 'squat') {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <UseCasesProvider useCases={someUseCases({ observeExerciseDetail: fake.useCase })}>
      {children}
    </UseCasesProvider>
  );
  return renderHook(
    ({ exerciseId }: { exerciseId: string }) => useExerciseDetailViewModel(exerciseId),
    {
      wrapper,
      initialProps: { exerciseId: id },
    },
  );
}

describe('useExerciseDetailViewModel', () => {
  it('is loading until the detail arrives', async () => {
    const { result } = await renderViewModel(fakeDetail());

    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('shows the exercise and whether it has progress (RF-CAT-02.AC2)', async () => {
    const fake = fakeDetail();
    const { result } = await renderViewModel(fake);

    await act(() => fake.emit('squat', SQUAT));

    expect(result.current.state).toEqual({
      status: 'content',
      exercise: SQUAT,
      hasProgress: false,
    });
  });

  it('is notFound when the exercise is not in the catalog (RN-CAT-04)', async () => {
    const fake = fakeDetail();
    const { result } = await renderViewModel(fake);

    await act(() => fake.emit('squat', null));

    expect(result.current.state).toEqual({ status: 'notFound' });
  });

  it('shows an error and retry() observes again', async () => {
    const fake = fakeDetail();
    const { result } = await renderViewModel(fake);
    await act(() => fake.fail('squat'));
    expect(result.current.state).toEqual({ status: 'error' });

    await act(() => result.current.actions.retry());

    expect(result.current.state).toEqual({ status: 'loading' });
    expect(fake.ids()).toEqual(['squat']);
  });

  it('observes the new id when it changes', async () => {
    const fake = fakeDetail();
    const { rerender } = await renderViewModel(fake);

    await rerender({ exerciseId: 'bench' });

    expect(fake.ids()).toEqual(['bench']);
  });
});
