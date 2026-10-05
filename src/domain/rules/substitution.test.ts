import { isSubstitution } from '@/domain/rules/substitution';
import { aWorkoutExercise } from '@/domain/testing/builders';

describe('RN-ENT-10 · substitution', () => {
  it('is a substitution when the exercise done differs from the planned one', () => {
    expect(
      isSubstitution(aWorkoutExercise({ plannedExerciseId: 'squat', exerciseId: 'leg-press' })),
    ).toBe(true);
  });

  it('is not a substitution when they match', () => {
    expect(
      isSubstitution(aWorkoutExercise({ plannedExerciseId: 'squat', exerciseId: 'squat' })),
    ).toBe(false);
  });

  it('an unplanned exercise is not a substitution (06 §3)', () => {
    expect(
      isSubstitution(
        aWorkoutExercise({ routineExerciseId: null, plannedExerciseId: null, exerciseId: 'squat' }),
      ),
    ).toBe(false);
  });
});
