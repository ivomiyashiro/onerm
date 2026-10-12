import type { Exercise } from '@/domain/models/exercise';
import type { Workout } from '@/domain/models/workout';
import type { Observer } from '@/domain/repositories/observer';
import { aBilateralSet, aWorkout, aWorkoutExercise, anExercise } from '@/domain/testing/builders';
import {
  ObserveExerciseDetail,
  type ExerciseDetail,
} from '@/domain/usecases/observe-exercise-detail';

const SQUAT = anExercise({ id: 'squat' });

function finishedWith(exerciseId: string, sets = [aBilateralSet()]): Workout {
  return aWorkout({
    status: 'finished',
    finishedAt: new Date('2026-10-01T10:00:00Z'),
    exercises: [aWorkoutExercise({ exerciseId, sets })],
  });
}

function fakes() {
  const exerciseObservers = new Set<Observer<Exercise | null>>();
  const workoutObservers = new Set<Observer<Workout[]>>();
  return {
    exercises: {
      observeById: (_id: string, observer: Observer<Exercise | null>) => {
        exerciseObservers.add(observer);
        return () => exerciseObservers.delete(observer);
      },
    },
    workouts: {
      observeFinished: (observer: Observer<Workout[]>) => {
        workoutObservers.add(observer);
        return () => workoutObservers.delete(observer);
      },
    },
    emitExercise: (e: Exercise | null) => exerciseObservers.forEach((o) => o.next(e)),
    emitWorkouts: (w: Workout[]) => workoutObservers.forEach((o) => o.next(w)),
    failWorkouts: () => workoutObservers.forEach((o) => o.error(new Error('disk'))),
    count: () => exerciseObservers.size + workoutObservers.size,
  };
}

function observe(f: ReturnType<typeof fakes>) {
  const values: (ExerciseDetail | null)[] = [];
  const error = jest.fn();
  const unsubscribe = new ObserveExerciseDetail(f.exercises, f.workouts).execute('squat', {
    next: (value) => values.push(value),
    error,
  });
  return { values, error, unsubscribe, last: () => values[values.length - 1] };
}

describe('ObserveExerciseDetail', () => {
  it('waits for both observations before emitting', () => {
    const f = fakes();
    const { values } = observe(f);

    f.emitExercise(SQUAT);

    expect(values).toEqual([]);
  });

  it('RF-CAT-02.AC2: has progress when a finished workout logged effective sets of it', () => {
    const f = fakes();
    const { last } = observe(f);

    f.emitExercise(SQUAT);
    f.emitWorkouts([finishedWith('squat')]);

    expect(last()).toEqual({ exercise: SQUAT, hasProgress: true });
  });

  it('RF-CAT-02.AC2: no progress without sets of this exercise', () => {
    const f = fakes();
    const { last } = observe(f);

    f.emitExercise(SQUAT);
    f.emitWorkouts([finishedWith('bench')]);

    expect(last()).toEqual({ exercise: SQUAT, hasProgress: false });
  });

  it('RF-CAT-02.AC2: warm-up sets alone are no progress (RN-ENT-12)', () => {
    const f = fakes();
    const { last } = observe(f);

    f.emitExercise(SQUAT);
    f.emitWorkouts([finishedWith('squat', [aBilateralSet({ isWarmup: true })])]);

    expect(last()).toEqual({ exercise: SQUAT, hasProgress: false });
  });

  it('emits null when the exercise is not in the catalog', () => {
    const f = fakes();
    const { last } = observe(f);

    f.emitExercise(null);
    f.emitWorkouts([]);

    expect(last()).toBeNull();
  });

  it('follows later changes of either source', () => {
    const f = fakes();
    const { last } = observe(f);
    f.emitExercise(SQUAT);
    f.emitWorkouts([]);

    f.emitWorkouts([finishedWith('squat')]);

    expect(last()).toEqual({ exercise: SQUAT, hasProgress: true });
  });

  it('an error in one source ends both observations', () => {
    const f = fakes();
    const { error } = observe(f);

    f.failWorkouts();

    expect(error).toHaveBeenCalledTimes(1);
    expect(f.count()).toBe(0);
  });

  it('an error while subscribing (the first query runs at once) never subscribes the rest', () => {
    const observeFinished = jest.fn();
    const error = jest.fn();
    const failing = {
      observeById: (_id: string, observer: Observer<Exercise | null>) => {
        observer.error(new Error('disk'));
        return () => {};
      },
    };

    new ObserveExerciseDetail(failing, { observeFinished }).execute('squat', {
      next: jest.fn(),
      error,
    });

    expect(error).toHaveBeenCalledTimes(1);
    expect(observeFinished).not.toHaveBeenCalled();
  });

  it('unsubscribing stops both observations', () => {
    const f = fakes();
    const { unsubscribe } = observe(f);

    unsubscribe();

    expect(f.count()).toBe(0);
  });
});
