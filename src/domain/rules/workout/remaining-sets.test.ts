import { firstIncomplete, remainingSets } from '@/domain/rules/workout/remaining-sets';
import { aBilateralSet, aPrescription, aWorkoutExercise } from '@/domain/testing/builders';

const exercise = (sets: number, logged: { isWarmup?: boolean }[], id = 'we') =>
  aWorkoutExercise({
    id,
    prescription: aPrescription({ sets }),
    sets: logged.map((s, i) => aBilateralSet({ id: `${id}-${i}`, position: i, ...s })),
  });

describe('remainingSets', () => {
  it('the prescribed sets not logged yet; warm-ups do not count (RN-ENT-12)', () => {
    expect(remainingSets(exercise(3, [{ isWarmup: true }, {}]))).toBe(2);
  });

  it('never below zero, with extra sets (RF-ENT-05)', () => {
    expect(remainingSets(exercise(1, [{}, {}]))).toBe(0);
  });

  it('extra sets add to what remains', () => {
    expect(remainingSets(exercise(1, [{}]), 1)).toBe(1);
  });
});

describe('firstIncomplete (RF-ENT-02.AC7)', () => {
  it('the next exercise with sets left after the given one, wrapping around', () => {
    const exercises = [exercise(1, [], 'a'), exercise(1, [{}], 'b'), exercise(1, [], 'c')];

    expect(firstIncomplete(exercises, 0)).toBe(2);
    expect(firstIncomplete(exercises, 2)).toBe(0);
  });

  it('RF-ENT-08.AC1: a skipped exercise is passed over', () => {
    const exercises = [
      exercise(1, [], 'a'),
      { ...exercise(1, [], 'b'), status: 'skipped' as const },
      exercise(1, [], 'c'),
    ];

    expect(firstIncomplete(exercises, 0)).toBe(2);
  });

  it('RF-ENT-08.AC1: «Hecho» goes on with the ones ahead even if they were only looked at', () => {
    const exercises = [1, 2, 3, 4, 5].map((n) => exercise(1, [], String(n)));
    const lookedAt = new Set(['3', '4']);

    expect(firstIncomplete(exercises, 1, undefined, lookedAt)).toBe(2);
  });

  it('RF-ENT-08.AC1: the ones left behind are not asked for again when wrapping around', () => {
    const exercises = [1, 2, 3, 4].map((n) => exercise(1, [], String(n)));

    expect(firstIncomplete(exercises, 3, undefined, new Set(['1', '2', '3']))).toBeNull();
    expect(firstIncomplete(exercises, 3, undefined, new Set(['1', '3']))).toBe(1);
  });

  it('null when everything is done', () => {
    expect(firstIncomplete([exercise(1, [{}])], 0)).toBeNull();
  });
});
