import {
  aBilateralSet,
  anExercise,
  aPrescription,
  aWorkout,
  aWorkoutExercise,
} from '@/domain/testing/builders';
import {
  FakeRestCountdown,
  FakeRestNotifier,
  InMemoryRestTimerRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { SkipRest } from '@/domain/usecases/rest-timer';
import {
  DiscardWorkout,
  FinishWorkout,
  ReadWorkoutResume,
  SubstituteExercise,
} from '@/domain/usecases/workout-lifecycle';

const STARTED = new Date('2026-10-13T18:00:00Z');
const NOW = new Date('2026-10-13T19:00:00Z');
const PRESS = aWorkoutExercise({
  id: 'we-1',
  routineExerciseId: 're-1',
  plannedExerciseId: 'machine-chest-press',
  exerciseId: 'machine-chest-press',
  position: 0,
  prescription: aPrescription({ sets: 3, restSeconds: 120 }),
});
const ROW = aWorkoutExercise({
  id: 'we-2',
  routineExerciseId: 're-2',
  plannedExerciseId: 'seated-cable-row',
  exerciseId: 'seated-cable-row',
  position: 1,
});
const CURL = aWorkoutExercise({
  id: 'we-3',
  routineExerciseId: 're-3',
  plannedExerciseId: 'dumbbell-curl',
  exerciseId: 'dumbbell-curl',
  position: 2,
});
const CABLE_PRESS = anExercise({
  id: 'cable-chest-press',
  loadType: 'external',
  isUnilateral: true,
});

function setUp(exercises = [PRESS, ROW, CURL]) {
  let n = 0;
  const workouts = new InMemoryWorkoutRepository(
    aWorkout({ status: 'in_progress', startedAt: STARTED, finishedAt: null, exercises }),
  );
  const timers = new InMemoryRestTimerRepository({
    endsAt: new Date('2026-10-13T19:01:00Z'),
    notificationPermissionAsked: true,
  });
  const notifier = new FakeRestNotifier();
  notifier.scheduled = { at: timers.timer.endsAt!, message: { title: 't', body: 'b' } };
  const stopRest = new SkipRest(timers, notifier, new FakeRestCountdown());
  return {
    workouts,
    timers,
    notifier,
    exercises: () => workouts.inProgress!.exercises,
    substitute: new SubstituteExercise(workouts, () => `we-new-${++n}`),
    finish: new FinishWorkout(workouts, stopRest, () => NOW),
    discard: new DiscardWorkout(workouts, stopRest),
  };
}

const effective = (id: string, workoutExerciseId: string, at = '2026-10-13T18:30:00Z') =>
  aBilateralSet({ id, workoutExerciseId, completedAt: new Date(at) });

describe('SubstituteExercise', () => {
  it('RN-ENT-10: without sets, the substitute takes its place with the original prescription', async () => {
    const { substitute, exercises } = setUp();

    const id = await substitute.execute('we-1', CABLE_PRESS);

    expect(id).toBe('we-new-1');
    expect(exercises().map((e) => [e.id, e.position])).toEqual([
      ['we-new-1', 0],
      ['we-2', 1],
      ['we-3', 2],
    ]);
    expect(exercises()[0]).toEqual({
      ...PRESS,
      id: 'we-new-1',
      exerciseId: 'cable-chest-press',
      // RN-ENT-08: the set format comes from the exercise actually done.
      isUnilateral: true,
      status: 'pending',
      sets: [],
    });
  });

  it('RF-ENT-09.AC4: the original keeps its sets and the substitute comes right after it', async () => {
    const { substitute, exercises } = setUp([
      { ...PRESS, status: 'done', sets: [effective('s1', 'we-1')] },
      ROW,
      CURL,
    ]);

    await substitute.execute('we-1', CABLE_PRESS);

    expect(exercises().map((e) => [e.id, e.position, e.status, e.sets.length])).toEqual([
      ['we-1', 0, 'done', 1],
      ['we-new-1', 1, 'pending', 0],
      ['we-2', 2, 'pending', 0],
      ['we-3', 3, 'pending', 0],
    ]);
  });

  it('RN-ENT-10: an original with only warm-ups is left skipped', async () => {
    const { substitute, exercises } = setUp([
      { ...PRESS, sets: [aBilateralSet({ workoutExerciseId: 'we-1', isWarmup: true })] },
    ]);

    await substitute.execute('we-1', CABLE_PRESS);

    expect(exercises().map((e) => [e.id, e.status])).toEqual([
      ['we-1', 'skipped'],
      ['we-new-1', 'pending'],
    ]);
  });
});

describe('FinishWorkout', () => {
  it('RF-ENT-11.AC1: the workout is finished now and the rest is stopped', async () => {
    const { finish, workouts, timers, notifier } = setUp([
      { ...PRESS, status: 'done', sets: [effective('s1', 'we-1')] },
    ]);

    const id = await finish.execute();

    expect(id).toBe('workout-1');
    expect(workouts.inProgress).toBeNull();
    expect(workouts.finished[0]).toMatchObject({ status: 'finished', finishedAt: NOW });
    expect(timers.timer.endsAt).toBeNull();
    expect(notifier.scheduled).toBeNull();
  });

  it('RF-ENT-11.AC2: the exercises without effective sets are left skipped', async () => {
    const { finish, workouts } = setUp([
      { ...PRESS, status: 'done', sets: [effective('s1', 'we-1')] },
      ROW,
      { ...CURL, sets: [aBilateralSet({ workoutExerciseId: 'we-3', isWarmup: true })] },
    ]);

    await finish.execute();

    expect(workouts.finished[0].exercises.map((e) => e.status)).toEqual([
      'done',
      'skipped',
      'skipped',
    ]);
  });

  it('RN-ENT-11: an abandoned workout ends at its last set', async () => {
    const { finish, workouts } = setUp([
      {
        ...PRESS,
        status: 'done',
        sets: [
          effective('s1', 'we-1', '2026-10-13T18:20:00Z'),
          effective('s2', 'we-1', '2026-10-13T18:40:00Z'),
        ],
      },
      ROW,
    ]);

    await finish.execute({ abandoned: true });

    expect(workouts.finished[0].finishedAt).toEqual(new Date('2026-10-13T18:40:00Z'));
  });

  it('RN-ENT-11: an abandoned workout without sets ends when it started', async () => {
    const { finish, workouts } = setUp();

    await finish.execute({ abandoned: true });

    expect(workouts.finished[0].finishedAt).toEqual(STARTED);
  });

  it('returns null without a workout in progress', async () => {
    const { finish, discard } = setUp();
    await discard.execute();

    expect(await finish.execute()).toBeNull();
  });
});

describe('DiscardWorkout', () => {
  it('RF-ENT-12.AC1: the workout is deleted and the rest is stopped', async () => {
    const { discard, workouts, timers, notifier } = setUp();

    await discard.execute();

    expect(workouts.inProgress).toBeNull();
    expect(workouts.finished).toEqual([]);
    expect(timers.timer.endsAt).toBeNull();
    expect(notifier.scheduled).toBeNull();
  });
});

describe('ReadWorkoutResume', () => {
  const read = (workouts: InMemoryWorkoutRepository, now: string) =>
    new ReadWorkoutResume(workouts, () => new Date(now)).execute();

  it('without a workout in progress there is nothing to resume', async () => {
    expect(await read(new InMemoryWorkoutRepository(), '2026-10-13T19:00:00Z')).toEqual({
      kind: 'none',
    });
  });

  it('RF-ENT-13.AC1: a workout started less than 12 h ago is resumed', async () => {
    const { workouts } = setUp();

    expect(await read(workouts, '2026-10-14T06:00:00Z')).toEqual({ kind: 'resume' });
  });

  it('RF-ENT-13.AC2: after more than 12 h it is abandoned, with its sets (RN-ENT-11)', async () => {
    const { workouts } = setUp([
      {
        ...PRESS,
        sets: [
          effective('s1', 'we-1'),
          aBilateralSet({ id: 's2', workoutExerciseId: 'we-1', isWarmup: true }),
        ],
      },
    ]);

    expect(await read(workouts, '2026-10-14T06:00:01Z')).toEqual({
      kind: 'abandoned',
      startedAt: STARTED,
      sets: 2,
    });
  });
});
