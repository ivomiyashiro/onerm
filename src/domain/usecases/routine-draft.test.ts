import type { Exercise } from '@/domain/models/exercise';
import type { Profile } from '@/domain/models/profile';
import type { Observer } from '@/domain/repositories/observer';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutine, aRoutineDay, anExercise, aWorkout } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { EditRoutineDraft, LoadRoutineDraft, SaveRoutine } from '@/domain/usecases/routine-draft';

const PROFILE: Profile = { ...defaultProfile(), goal: 'strength', level: 'intermediate' };
const SQUAT = anExercise();
const CURL = anExercise({ id: 'curl', name: 'Curl de bíceps', mechanic: 'isolation' });

function setUp({ inProgress = false, saved = [aRoutine()] } = {}) {
  const routines = new InMemoryRoutineRepository(saved);
  const exercises = {
    observeAll: (observer: Observer<Exercise[]>) => {
      observer.next([SQUAT, CURL]);
      return () => {};
    },
  };
  let n = 0;
  const newId = () => `new-${++n}`;
  return {
    routines,
    load: new LoadRoutineDraft(
      routines,
      exercises,
      new InMemoryProfileRepository(PROFILE),
      new InMemoryWorkoutRepository(inProgress ? aWorkout({ status: 'in_progress' }) : null),
      newId,
    ),
    edit: new EditRoutineDraft(newId),
    save: new SaveRoutine(routines),
  };
}

describe('LoadRoutineDraft', () => {
  it('RF-RUT-03: a new routine starts without a name and with «Día A»', async () => {
    const draft = await setUp().load.execute(null);

    expect(draft).toMatchObject({ isNew: true, workoutInProgress: false });
    expect(draft?.routine).toEqual({
      id: 'new-1',
      name: '',
      sourceTemplateId: null,
      days: [{ id: 'new-2', routineId: 'new-1', name: 'Día A', position: 0, exercises: [] }],
    });
  });

  it('RF-RUT-04: brings the routine, the catalog, the profile and whether a workout is in progress (AC2)', async () => {
    const draft = await setUp({ inProgress: true }).load.execute('routine-1');

    expect(draft).toMatchObject({ isNew: false, routine: aRoutine(), workoutInProgress: true });
    expect(draft?.exercises.get('curl')).toBe(CURL);
    expect(draft?.profile).toBe(PROFILE);
  });

  it('is null for a routine that no longer exists', async () => {
    await expect(setUp().load.execute('gone')).resolves.toBeNull();
  });
});

describe('EditRoutineDraft', () => {
  it('adds an empty day with the next letter, and an exercise with its defaults (RF-RUT-03.AC2)', () => {
    const { edit } = setUp();

    const withDay = edit.addDay(aRoutine());
    expect(withDay.days[1]).toMatchObject({ id: 'new-1', name: 'Día B', exercises: [] });

    const withCurl = edit.addExercise(withDay, 'new-1', CURL, PROFILE);
    expect(withCurl.days[1].exercises[0]).toMatchObject({
      id: 'new-2',
      exerciseId: 'curl',
      prescription: { role: 'accessory', sets: 2, repRange: { min: 8, max: 12 } },
    });
  });
});

describe('SaveRoutine', () => {
  it('RF-RUT-03.AC4: a day without exercises is not saved, and the violation says which', async () => {
    const { save, routines } = setUp();
    const empty = aRoutine({ id: 'new', days: [aRoutineDay({ exercises: [] })] });

    await expect(save.execute(empty)).resolves.toEqual({
      status: 'invalid',
      violations: [{ code: 'day.exercises', path: ['days', 0, 'exercises'] }],
    });
    expect(routines.routines).toHaveLength(1);
  });

  it('RF-RUT-03.AC1: saves the routine with trimmed names and its positions', async () => {
    const { save, routines } = setUp({ saved: [] });
    const days = [aRoutineDay({ id: 'b', position: 7 }), aRoutineDay({ id: 'a', position: 3 })];

    await expect(
      save.execute(
        aRoutine({ name: '  Pierna  ', days: [{ ...days[0], name: ' Día B ' }, days[1]] }),
      ),
    ).resolves.toEqual({ status: 'saved' });

    const [saved] = routines.routines;
    expect(saved.name).toBe('Pierna');
    expect(saved.days.map((d) => [d.id, d.name, d.position])).toEqual([
      ['b', 'Día B', 0],
      ['a', 'Día A', 1],
    ]);
  });

  it('RF-RUT-04.AC5: the positions of deleted days are not reused', async () => {
    const two = aRoutine({
      days: [aRoutineDay({ id: 'a', position: 0 }), aRoutineDay({ id: 'b', position: 1 })],
    });
    const { save, routines } = setUp({ saved: [two] });

    await save.execute({ ...two, days: [two.days[0], aRoutineDay({ id: 'c' })] });

    expect(routines.routines[0].days.map((d) => [d.id, d.position])).toEqual([
      ['a', 0],
      ['c', 2],
    ]);
  });
});
