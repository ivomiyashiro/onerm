import { runPipeline, slugify, validateExercise, type CurationEntry } from './pipeline';
import type { ExerciseCandidate, ExerciseSourceAdapter } from './types';

const ID_A = '69aee190-c7d4-4241-a7c3-171912305d67';
const ID_B = 'd37937e1-b735-449b-ac07-30b8ffbaeb28';

function candidate(overrides: Partial<ExerciseCandidate> = {}): ExerciseCandidate {
  return {
    source: 'fake',
    externalId: '1',
    name: 'Prensa de piernas',
    aliases: ['Leg press'],
    loadType: 'external',
    primaryMuscles: ['quads'],
    secondaryMuscles: ['glutes'],
    primaryEquipment: null,
    equipment: [],
    mechanic: null,
    isUnilateral: null,
    description: null,
    attribution: { source: 'fake', license: 'CC0', attribution: 'someone' },
    ...overrides,
  };
}

/** A source that returns the candidates it is given, and rejects the ids in `rejects`. */
function fakeSource(
  candidates: readonly ExerciseCandidate[],
  rejects: Record<string, string> = {},
): ExerciseSourceAdapter {
  return {
    sourceId: 'fake',
    async *extract() {
      yield* candidates;
      for (const id of Object.keys(rejects)) yield { rejectedId: id };
    },
    map: (raw) => {
      const rejectedId = (raw as { rejectedId?: string }).rejectedId;
      return rejectedId
        ? { ok: false, externalId: rejectedId, reason: rejects[rejectedId] }
        : { ok: true, candidate: raw as ExerciseCandidate };
    },
  };
}

const entry = (overrides: Partial<CurationEntry> = {}): CurationEntry => ({
  id: ID_A,
  source: 'fake',
  externalId: '1',
  primaryEquipment: 'machine',
  mechanic: 'compound',
  isUnilateral: false,
  ...overrides,
});

describe('catalog seed pipeline (ADR-0004 §3)', () => {
  it('turns a curated candidate into a canonical exercise with its attribution', async () => {
    const report = await runPipeline([fakeSource([candidate()])], [entry()]);

    expect(report.errors).toEqual([]);
    expect(report.exercises).toEqual([
      {
        exercise: {
          id: ID_A,
          slug: 'prensa-de-piernas',
          name: 'Prensa de piernas',
          aliases: ['Leg press'],
          loadType: 'external',
          primaryMuscles: ['quads'],
          secondaryMuscles: ['glutes'],
          primaryEquipment: 'machine',
          equipment: ['machine'],
          mechanic: 'compound',
          isUnilateral: false,
          description: null,
          attributions: [{ source: 'fake', license: 'CC0', attribution: 'someone' }],
          deprecatedAt: null,
        },
        sourceRefs: [{ source: 'fake', externalId: '1' }],
      },
    ]);
  });

  it('lets the curation override what the source says', async () => {
    const report = await runPipeline(
      [fakeSource([candidate()])],
      [entry({ name: '  Prensa   45° ', slug: 'prensa-45', aliases: ['Leg press 45'] })],
    );
    expect(report.exercises[0].exercise).toMatchObject({
      name: 'Prensa 45°',
      slug: 'prensa-45',
      aliases: ['Leg press 45'],
    });
  });

  it('only includes what the curation lists (less noise)', async () => {
    const report = await runPipeline(
      [fakeSource([candidate(), candidate({ externalId: '2', name: 'Otro' })])],
      [entry()],
    );
    expect(report.exercises).toHaveLength(1);
  });

  it('reports a rejected candidate and fails the curated one that depends on it', async () => {
    const report = await runPipeline([fakeSource([], { '1': 'unmapped muscle "X"' })], [entry()]);
    expect(report.rejected).toEqual([
      { source: 'fake', externalId: '1', reason: 'unmapped muscle "X"' },
    ]);
    expect(report.errors).toEqual([
      expect.stringContaining('rejected by the source: unmapped muscle "X"'),
    ]);
    expect(report.exercises).toEqual([]);
  });

  it('fails a curated entry that the source no longer has', async () => {
    const report = await runPipeline([fakeSource([])], [entry()]);
    expect(report.errors).toEqual([expect.stringContaining('not found in the source')]);
  });

  it.each([
    ['name', { name: null }, {}, 'no Spanish name'],
    ['equipment', {}, { primaryEquipment: undefined }, 'no primaryEquipment'],
    ['mechanic', {}, { mechanic: undefined }, 'no mechanic'],
    ['laterality', {}, { isUnilateral: undefined }, 'no isUnilateral'],
  ] as const)(
    'does not invent the %s the source lacks',
    async (_label, fromSource, override, why) => {
      const report = await runPipeline([fakeSource([candidate(fromSource)])], [entry(override)]);
      expect(report.errors).toEqual([expect.stringContaining(why)]);
    },
  );

  it('sends an invalid exercise to the report', async () => {
    const report = await runPipeline([fakeSource([candidate({ primaryMuscles: [] })])], [entry()]);
    expect(report.errors).toEqual([expect.stringContaining('no primary muscle')]);
  });

  it('fails when two entries use the same id or slug, and reports similar names without merging', async () => {
    const report = await runPipeline(
      [
        fakeSource([
          candidate(),
          candidate({ externalId: '2' }),
          candidate({ externalId: '3', name: 'PRENSA de piernas' }),
        ]),
      ],
      [
        entry(),
        entry({ externalId: '2', id: ID_A, slug: 'otra' }),
        entry({ externalId: '3', id: ID_B, slug: 'tercera' }),
      ],
    );
    expect(report.errors).toEqual([expect.stringContaining('already used')]);
    expect(report.exercises.map((e) => e.exercise.id)).toEqual([ID_A, ID_B]);
    expect(report.possibleDuplicates).toEqual([expect.stringContaining('same normalized name')]);
  });

  it('fails when the curation lists the same source exercise twice', async () => {
    const report = await runPipeline([fakeSource([candidate()])], [entry(), entry({ id: ID_B })]);
    expect(report.errors).toEqual([expect.stringContaining('listed twice')]);
  });
});

describe('slugify and validateExercise', () => {
  it('slugifies without accents', () => {
    expect(slugify('Extensión de tríceps — polea')).toBe('extension-de-triceps-polea');
  });

  it('flags a muscle outside the vocabulary', () => {
    const problems = validateExercise({
      id: ID_A,
      slug: 'x',
      name: 'X',
      aliases: [],
      loadType: 'external',
      primaryMuscles: ['wings' as never],
      secondaryMuscles: [],
      primaryEquipment: 'machine',
      equipment: ['machine'],
      mechanic: 'compound',
      isUnilateral: false,
      description: null,
      attributions: [],
      deprecatedAt: null,
    });
    expect(problems).toEqual(['muscle "wings"']);
  });
});
