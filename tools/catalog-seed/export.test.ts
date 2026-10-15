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

const NOW = new Date('2026-10-15T12:00:00Z');
const previous: ExercisesFile = { version: 1, contentHash: 'old', exercises: [] };

describe('snapshot export (ADR-0004 §3)', () => {
  it('bumps the version when the content changes', () => {
    const file = buildExercisesFile([exercise], previous, NOW);
    expect(file.version).toBe(2);
    expect(file.exercises).toEqual([exercise]);
  });

  it('is idempotent: the same exercises give the same file and version', () => {
    const first = buildExercisesFile([exercise], previous, NOW);
    expect(buildExercisesFile([exercise], first, NOW)).toBe(first);
  });

  it('bumps again when an exercise changes', () => {
    const first = buildExercisesFile([exercise], previous, NOW);
    const second = buildExercisesFile([{ ...exercise, name: 'Prensa 45' }], first, NOW);
    expect(second.version).toBe(3);
  });

  it('writes a deprecation date as text', () => {
    const file = buildExercisesFile(
      [{ ...exercise, deprecatedAt: new Date('2026-10-14T00:00:00Z') }],
      previous,
      NOW,
    );
    expect(file.exercises[0].deprecatedAt).toBe('2026-10-14T00:00:00.000Z');
  });

  describe('RN-CAT-01: an exercise is never deleted', () => {
    const other = { ...exercise, id: 'd37937e1-b735-449b-ac07-30b8ffbaeb28', slug: 'otro' };
    const published = buildExercisesFile([exercise, other], previous, NOW);
    const LATER = new Date('2026-11-01T00:00:00Z');

    it('one that left the curation stays in the snapshot, marked obsolete', () => {
      const file = buildExercisesFile([exercise], published, LATER);

      expect(file.exercises.map((e) => [e.slug, e.deprecatedAt])).toEqual([
        ['prensa-piernas', null],
        ['otro', LATER.toISOString()],
      ]);
      expect(file.version).toBe(published.version + 1);
    });

    it('keeps the date it was retired on, so running the seed again changes nothing', () => {
      const retired = buildExercisesFile([exercise], published, LATER);

      const again = buildExercisesFile([exercise], retired, new Date('2027-01-01T00:00:00Z'));

      expect(again).toBe(retired);
    });

    it('one that comes back to the curation is current again', () => {
      const retired = buildExercisesFile([exercise], published, LATER);

      const back = buildExercisesFile([exercise, other], retired, LATER);

      expect(back.exercises.map((e) => e.deprecatedAt)).toEqual([null, null]);
    });

    it('does not retire what is still curated', () => {
      expect(buildExercisesFile([exercise, other], published, LATER)).toBe(published);
    });
  });

  describe('RN-CAT-05: what a routine depends on never changes for an id', () => {
    const published = buildExercisesFile([exercise], previous, NOW);

    it.each([
      ['loadType', { loadType: 'bodyweight' as const }],
      ['isUnilateral', { isUnilateral: true }],
      ['primaryEquipment', { primaryEquipment: 'cable' as const }],
    ])('refuses to change %s of a published exercise', (attribute, change) => {
      expect(() => buildExercisesFile([{ ...exercise, ...change }], published, NOW)).toThrow(
        attribute,
      );
    });

    it('lets the rest change: the name, the muscles, the aliases', () => {
      const renamed = buildExercisesFile(
        [{ ...exercise, name: 'Prensa 45', aliases: ['Leg press'], primaryMuscles: ['glutes'] }],
        published,
        NOW,
      );

      expect(renamed.version).toBe(published.version + 1);
    });

    it('a new exercise has no previous attributes to keep', () => {
      const other = { ...exercise, id: 'd37937e1-b735-449b-ac07-30b8ffbaeb28', slug: 'otro' };

      expect(() => buildExercisesFile([exercise, other], published, NOW)).not.toThrow();
    });
  });
});
