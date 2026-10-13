import { defaultProfile } from '@/domain/rules/routine/default-profile';
import {
  anExercise,
  aPrescription,
  aRoutine,
  aRoutineDay,
  aRoutineExercise,
  aWorkout,
} from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { StartWorkout } from '@/domain/usecases/start-workout';

const NOW = new Date('2026-10-13T18:00:00Z');
const ROW = anExercise({ id: 'one-arm-row', isUnilateral: true, primaryEquipment: 'dumbbell' });
const PULL_UP = anExercise({ id: 'pull-up', loadType: 'bodyweight' });
const ROUTINE = aRoutine({
  id: 'r1',
  name: 'Cuerpo completo',
  days: [
    aRoutineDay({ id: 'A', routineId: 'r1', name: 'Día A' }),
    aRoutineDay({
      id: 'B',
      routineId: 'r1',
      name: 'Día B',
      position: 1,
      exercises: [
        aRoutineExercise({
          id: 'B2',
          routineDayId: 'B',
          exerciseId: 'pull-up',
          position: 1,
          prescription: aPrescription({ role: 'accessory', sets: 2 }),
        }),
        aRoutineExercise({ id: 'B1', routineDayId: 'B', exerciseId: 'one-arm-row' }),
      ],
    }),
  ],
});

function setUp(inProgress = null as ReturnType<typeof aWorkout> | null) {
  let n = 0;
  const workouts = new InMemoryWorkoutRepository(inProgress);
  const startWorkout = new StartWorkout(
    new InMemoryProfileRepository({ ...defaultProfile(), activeRoutineId: 'r1' }),
    new InMemoryRoutineRepository([ROUTINE]),
    workouts,
    { observeAll: (o) => (o.next([ROW, PULL_UP]), () => {}) },
    () => `id-${++n}`,
    () => NOW,
  );
  return { workouts, startWorkout };
}

describe('StartWorkout', () => {
  it('RF-ENT-01.AC2, RN-ENT-08: copies the prescription of the day into a workout in progress', async () => {
    const { workouts, startWorkout } = setUp();

    const result = await startWorkout.execute('B');

    const workout = workouts.inProgress!;
    expect(result).toEqual({ status: 'started', workoutId: workout.id });
    expect(workout).toMatchObject({
      status: 'in_progress',
      routineId: 'r1',
      routineDayId: 'B',
      routineNameSnapshot: 'Cuerpo completo',
      dayNameSnapshot: 'Día B',
      startedAt: NOW,
      finishedAt: null,
    });
    expect(workout.exercises).toEqual([
      expect.objectContaining({
        routineExerciseId: 'B1',
        plannedExerciseId: 'one-arm-row',
        exerciseId: 'one-arm-row',
        position: 0,
        status: 'pending',
        prescription: ROUTINE.days[1].exercises[1].prescription,
        loadType: 'external',
        isUnilateral: true,
        sets: [],
      }),
      expect.objectContaining({
        routineExerciseId: 'B2',
        position: 1,
        loadType: 'bodyweight',
        isUnilateral: false,
      }),
    ]);
  });

  it('RN-ENT-01: with one in progress, it starts nothing and points to it', async () => {
    const { workouts, startWorkout } = setUp(
      aWorkout({ id: 'running', status: 'in_progress', finishedAt: null }),
    );

    expect(await startWorkout.execute('A')).toEqual({
      status: 'inProgress',
      workoutId: 'running',
    });
    expect(workouts.inProgress!.id).toBe('running');
  });

  it('a day that no longer exists starts nothing', async () => {
    const { workouts, startWorkout } = setUp();

    expect(await startWorkout.execute('gone')).toEqual({ status: 'missing' });
    expect(workouts.inProgress).toBeNull();
  });
});
