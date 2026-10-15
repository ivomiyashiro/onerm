import { buildExercisesFile, type ExercisesFile } from './export';
import type { Exercise } from '@/domain/models/exercise';

const exercise: Exercise = {
  id: '69aee190-c7d4-4241-a7c3-171912305d67',
  slug: 'prensa-piernas',
  name: 'Prensa de piernas',
  aliases: [],
  loadType: 'external',
  primaryMuscles: ['quads'],
  secondaryMuscles: [],
  primaryEquipment: 'machine',
  equipment: ['machine'],
  mechanic: 'compound',
  isUnilateral: false,
  description: null,
  attributions: [],
  deprecatedAt: null,
};

const previous: ExercisesFile = { version: 1, contentHash: 'old', exercises: [] };

describe('snapshot export (ADR-0004 §3)', () => {
  it('bumps the version when the content changes', () => {
    const file = buildExercisesFile([exercise], previous);
    expect(file.version).toBe(2);
    expect(file.exercises).toEqual([exercise]);
  });

  it('is idempotent: the same exercises give the same file and version', () => {
    const first = buildExercisesFile([exercise], previous);
    expect(buildExercisesFile([exercise], first)).toBe(first);
  });

  it('bumps again when an exercise changes', () => {
    const first = buildExercisesFile([exercise], previous);
    const second = buildExercisesFile([{ ...exercise, name: 'Prensa 45' }], first);
    expect(second.version).toBe(3);
  });

  it('writes a deprecation date as text', () => {
    const file = buildExercisesFile(
      [{ ...exercise, deprecatedAt: new Date('2026-10-14T00:00:00Z') }],
      previous,
    );
    expect(file.exercises[0].deprecatedAt).toBe('2026-10-14T00:00:00.000Z');
  });

  describe('RN-CAT-05: what a routine depends on never changes for an id', () => {
    const published = buildExercisesFile([exercise], previous);

    it.each([
      ['loadType', { loadType: 'bodyweight' as const }],
      ['isUnilateral', { isUnilateral: true }],
      ['primaryEquipment', { primaryEquipment: 'cable' as const }],
    ])('refuses to change %s of a published exercise', (attribute, change) => {
      expect(() => buildExercisesFile([{ ...exercise, ...change }], published)).toThrow(attribute);
    });

    it('lets the rest change: the name, the muscles, the aliases', () => {
      const renamed = buildExercisesFile(
        [{ ...exercise, name: 'Prensa 45', aliases: ['Leg press'], primaryMuscles: ['glutes'] }],
        published,
      );

      expect(renamed.version).toBe(published.version + 1);
    });

    it('a new exercise has no previous attributes to keep', () => {
      const other = { ...exercise, id: 'd37937e1-b735-449b-ac07-30b8ffbaeb28', slug: 'otro' };

      expect(() => buildExercisesFile([exercise, other], published)).not.toThrow();
    });
  });
});
