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
  };
}

function observe(f: ReturnType<typeof fakes>) {
  const values: (ExerciseDetail | null)[] = [];
  new ObserveExerciseDetail(f.exercises, f.workouts).execute('squat', {
    next: (value) => values.push(value),
    error: jest.fn(),
  });
  return { last: () => values[values.length - 1] };
}

describe('ObserveExerciseDetail', () => {
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
});
