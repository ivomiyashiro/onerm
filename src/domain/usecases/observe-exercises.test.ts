import type { Exercise } from '@/domain/models/exercise';
import type { ExerciseRepository } from '@/domain/repositories/exercise-repository';
import type { Observer } from '@/domain/repositories/observer';
import { anExercise } from '@/domain/testing/builders';
import { ObserveExercises } from '@/domain/usecases/observe-exercises';

const SQUAT: Exercise = anExercise({ id: 'squat', name: 'Sentadilla con barra' });

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
    emit: (exercises: Exercise[]) => observers.forEach((o) => o.next(exercises)),
  };
}

describe('ObserveExercises', () => {
  it('delivers the exercises the repository emits', () => {
    const { repository, emit } = fakeRepository();
    const next = jest.fn();

    new ObserveExercises(repository).execute({ next, error: jest.fn() });
    emit([SQUAT]);

    expect(next).toHaveBeenCalledWith([SQUAT]);
  });

  it('stops delivering after unsubscribing', () => {
    const { repository, emit } = fakeRepository();
    const next = jest.fn();

    const unsubscribe = new ObserveExercises(repository).execute({ next, error: jest.fn() });
    unsubscribe();
    emit([SQUAT]);

    expect(next).not.toHaveBeenCalled();
  });
});
