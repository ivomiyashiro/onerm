import type { LocalDate } from '@/domain/models/local-date';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { suggestionFor, type SuggestionInputs } from '@/domain/rules/workout/suggestion-for';
import {
  aBilateralSet,
  anExercise,
  aPrescription,
  aWorkout,
  aWorkoutExercise,
} from '@/domain/testing/builders';

const localDate = (instant: Date) => instant.toISOString().slice(0, 10) as LocalDate;
const DUMBBELL = anExercise({ id: 'db-press', primaryEquipment: 'dumbbell', equipment: ['dumbbell'] });

function inputs(overrides: Partial<SuggestionInputs> = {}): SuggestionInputs {
  return {
    profile: defaultProfile(),
    catalog: new Map([[DUMBBELL.id, DUMBBELL]]),
    finished: [],
    today: '2026-10-08',
    localDate,
    ...overrides,
  };
}

const planned = {
  routineExerciseId: 're-1',
  exerciseId: 'db-press',
  prescription: aPrescription({ repRange: { min: 8, max: 12 } }),
};

describe('suggestionFor', () => {
  it('RF-SUG-01.AC1: without any history, the instruction is to calibrate', () => {
    expect(suggestionFor(planned, inputs()).reason.code).toBe('CALIBRATION');
  });

  it('RF-SUG-01.AC3: with dumbbells the load is a multiple of 2 kg even after 11 kg by hand', () => {
    const done = aWorkout({
      exercises: [
        aWorkoutExercise({
          routineExerciseId: 're-1',
          plannedExerciseId: 'db-press',
          exerciseId: 'db-press',
          status: 'done',
          sets: [0, 1, 2].map((position) =>
            aBilateralSet({ id: `s${position}`, position, loadKg: 11, reps: 12, rir: 2 }),
          ),
        }),
      ],
    });

    const { loadKg } = suggestionFor(planned, inputs({ finished: [done] }));

    expect(loadKg! % 2).toBe(0);
  });

  it('RN-SUG-15: an unplanned exercise uses the history of the exercise in any context', () => {
    const elsewhere = aWorkout({
      exercises: [
        aWorkoutExercise({
          routineExerciseId: 'other-routine-exercise',
          exerciseId: 'db-press',
          plannedExerciseId: 'db-press',
          status: 'done',
          sets: [aBilateralSet({ loadKg: 20, reps: 10 })],
        }),
      ],
    });

    const suggestion = suggestionFor(
      { ...planned, routineExerciseId: null },
      inputs({ finished: [elsewhere] }),
    );

    expect(suggestion.reason.code).not.toBe('CALIBRATION');
  });

  it('a bodyweight exercise never suggests a load', () => {
    const pullUp = anExercise({ id: 'pull-up', loadType: 'bodyweight', primaryEquipment: 'bodyweight' });

    const suggestion = suggestionFor(
      { ...planned, exerciseId: 'pull-up' },
      inputs({ catalog: new Map([[pullUp.id, pullUp]]) }),
    );

    expect(suggestion.loadKg).toBeNull();
  });
});
