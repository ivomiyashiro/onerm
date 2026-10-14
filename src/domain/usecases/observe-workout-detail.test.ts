import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aBilateralSet, anExercise, aWorkout, aWorkoutExercise } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { ObserveWorkoutDetail, type WorkoutDetail } from '@/domain/usecases/observe-workout-detail';

const ROW = anExercise({ id: 'cable-row', name: 'Remo sentado en polea' });
const ONE_ARM = anExercise({ id: 'one-arm-row', name: 'Remo con mancuerna a una mano' });
const WORKOUT = aWorkout({
  id: 'w1',
  exercises: [
    aWorkoutExercise({
      id: 'we-2',
      position: 1,
      plannedExerciseId: 'cable-row',
      exerciseId: 'one-arm-row',
      status: 'done',
      sets: [
        aBilateralSet({ id: 's2', position: 1, workoutExerciseId: 'we-2' }),
        aBilateralSet({ id: 's1', position: 0, workoutExerciseId: 'we-2' }),
      ],
    }),
    aWorkoutExercise({
      id: 'we-1',
      plannedExerciseId: 'cable-row',
      exerciseId: 'cable-row',
      status: 'skipped',
    }),
  ],
});

function observe(id = 'w1') {
  let detail: WorkoutDetail | null | undefined;
  new ObserveWorkoutDetail(
    new InMemoryProfileRepository(defaultProfile()),
    new InMemoryWorkoutRepository(null, [WORKOUT]),
    { observeAll: (o) => (o.next([ROW, ONE_ARM]), () => {}) },
  ).execute(id, { next: (value) => (detail = value), error: jest.fn() });
  return detail;
}

describe('ObserveWorkoutDetail', () => {
  it('RF-PROG-02.AC1: the exercises in order, the skipped one and the substitute marked', () => {
    const detail = observe()!;

    expect(detail).toMatchObject({ id: 'w1', sets: 2, minutes: 60, unit: 'kg', records: [] });
    expect(detail.exercises.map((e) => [e.name, e.exercise.status, e.plannedName])).toEqual([
      ['Remo sentado en polea', 'skipped', null],
      ['Remo con mancuerna a una mano', 'done', 'Remo sentado en polea'],
    ]);
    expect(detail.exercises[1].exercise.sets.map((s) => s.id)).toEqual(['s1', 's2']);
  });

  it('null when the workout is gone', () => {
    expect(observe('other')).toBeNull();
  });
});
