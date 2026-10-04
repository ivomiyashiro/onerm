import { InMemoryExerciseRepository } from '@/data/repositories/in-memory-exercise-repository';
import type { Exercise } from '@/domain/models/exercise';

const SQUAT: Exercise = { id: 'squat', name: 'Sentadilla con barra' };
const BENCH: Exercise = { id: 'bench-press', name: 'Press de banca' };

describe('InMemoryExerciseRepository', () => {
  it('emits the current exercises on subscribe', () => {
    const repository = new InMemoryExerciseRepository([SQUAT]);
    const next = jest.fn();

    repository.observeAll({ next, error: jest.fn() });

    expect(next).toHaveBeenCalledWith([SQUAT]);
  });

  it('emits again after replaceAll()', () => {
    const repository = new InMemoryExerciseRepository([SQUAT]);
    const next = jest.fn();
    repository.observeAll({ next, error: jest.fn() });

    repository.replaceAll([SQUAT, BENCH]);

    expect(next).toHaveBeenLastCalledWith([SQUAT, BENCH]);
  });

  it('does not emit to an observer that unsubscribed', () => {
    const repository = new InMemoryExerciseRepository([SQUAT]);
    const next = jest.fn();
    const unsubscribe = repository.observeAll({ next, error: jest.fn() });

    unsubscribe();
    repository.replaceAll([BENCH]);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does not let observers mutate the stored list', () => {
    const repository = new InMemoryExerciseRepository([SQUAT]);
    repository.observeAll({ next: (exercises) => exercises.push(BENCH), error: jest.fn() });
    const next = jest.fn();

    repository.observeAll({ next, error: jest.fn() });

    expect(next).toHaveBeenCalledWith([SQUAT]);
  });
});
