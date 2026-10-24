import { anExercise } from '@/domain/testing/builders';

import {
  runPipeline,
  slugify,
  validateExercise,
  type CurationEntry,
  type TechniqueEntry,
} from './pipeline';
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
          technique: null,
          machine: null,
          videoUrl: null,
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

  const valid = (overrides: Parameters<typeof anExercise>[0]) =>
    anExercise({
      id: ID_A,
      slug: 'x',
      primaryEquipment: 'machine',
      equipment: ['machine'],
      ...overrides,
    });

  it('flags a muscle outside the vocabulary', () => {
    expect(validateExercise(valid({ primaryMuscles: ['wings' as never] }))).toEqual([
      'muscle "wings"',
    ]);
  });

  it('flags a machine outside the vocabulary, or on an exercise that is not done on a machine', () => {
    expect(validateExercise(valid({ machine: 'rowing-boat' as never }))).toEqual([
      'machine "rowing-boat"',
    ]);
    expect(
      validateExercise(
        valid({ primaryEquipment: 'dumbbell', equipment: ['dumbbell'], machine: 'leg-press' }),
      ),
    ).toEqual(['machine "leg-press" on an exercise whose primaryEquipment is not machine']);
  });

  it('flags a technique without steps and a video that is not https', () => {
    expect(
      validateExercise(
        valid({ technique: { steps: [], mistakes: [] }, videoUrl: 'http://example.com/v' }),
      ),
    ).toEqual(['technique without steps', 'videoUrl "http://example.com/v" is not https']);
  });
});

describe('technique (#306, RF-CAT-02)', () => {
  const technique = (overrides: Partial<TechniqueEntry> = {}): TechniqueEntry => ({
    exercises: ['prensa', 'prensa-discos'],
    steps: ['Sentate.', 'Empujá.'],
    mistakes: ['Trabar las rodillas.'],
    ...overrides,
  });
  const twoPresses = () =>
    runPipeline.bind(
      null,
      [fakeSource([candidate(), candidate({ externalId: '2' })])],
      [
        entry({ slug: 'prensa', machine: 'leg-press' }),
        entry({ externalId: '2', id: ID_B, slug: 'prensa-discos', name: 'Prensa de discos' }),
      ],
    );

  it('gives every exercise it lists the same steps, mistakes and video', async () => {
    const report = await twoPresses()([technique({ videoUrl: 'https://youtu.be/abc' })]);

    expect(report.errors).toEqual([]);
    expect(report.exercises.map(({ exercise }) => exercise)).toEqual([
      expect.objectContaining({
        slug: 'prensa',
        machine: 'leg-press',
        technique: { steps: ['Sentate.', 'Empujá.'], mistakes: ['Trabar las rodillas.'] },
        videoUrl: 'https://youtu.be/abc',
      }),
      expect.objectContaining({
        slug: 'prensa-discos',
        machine: null,
        technique: { steps: ['Sentate.', 'Empujá.'], mistakes: ['Trabar las rodillas.'] },
        videoUrl: 'https://youtu.be/abc',
      }),
    ]);
  });

  it('fails a technique that names an exercise the catalog does not have', async () => {
    const report = await twoPresses()([technique({ exercises: ['prensa', 'sentadilla'] })]);
    expect(report.errors).toEqual([expect.stringContaining('"sentadilla" is not in the catalog')]);
  });

  it('fails an exercise listed in two techniques', async () => {
    const report = await twoPresses()([
      technique({ exercises: ['prensa'] }),
      technique({ exercises: ['prensa'] }),
    ]);
    expect(report.errors).toEqual([expect.stringContaining('"prensa" has two techniques')]);
  });

  it('fails a technique that would make an exercise invalid', async () => {
    const report = await twoPresses()([technique({ steps: [] })]);
    expect(report.errors).toEqual([
      expect.stringContaining('technique without steps'),
      expect.stringContaining('technique without steps'),
    ]);
  });
});
