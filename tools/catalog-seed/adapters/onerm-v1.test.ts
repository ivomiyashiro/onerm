import type { SourceBase, SourceVariant } from '../onerm-v1/catalog';

import { mapOnermV1Variant } from './onerm-v1';

const benchPress: SourceBase = {
  slug: 'bench-press',
  es: 'Press de banca',
  en: 'Bench press',
  mechanic: 'compound',
  targetMuscles: ['mid-chest'],
  secondaryMuscles: ['triceps', 'front-delts'],
  aliases: [],
};

function variant(overrides: Partial<SourceVariant> = {}): SourceVariant {
  return {
    slug: 'barbell-bench-press',
    base: benchPress,
    equipment: 'barbell',
    laterality: 'bilateral',
    ...overrides,
  };
}

function base(overrides: Partial<SourceBase>): SourceBase {
  return { ...benchPress, ...overrides };
}

describe('onerm-v1 adapter: map (ADR-0004 §2)', () => {
  it('maps a variant to a candidate with its name, equipment and mechanic', () => {
    expect(mapOnermV1Variant(variant())).toEqual({
      ok: true,
      candidate: {
        source: 'onerm-v1',
        externalId: 'barbell-bench-press',
        name: 'Press de banca con barra',
        aliases: ['Barbell bench press'],
        loadType: 'external',
        primaryMuscles: ['chest'],
        secondaryMuscles: ['triceps', 'shoulders'],
        primaryEquipment: 'barbell',
        equipment: ['barbell'],
        mechanic: 'compound',
        isUnilateral: false,
        attribution: {
          source: 'OneRM',
          license: 'Catálogo propio',
          attribution: 'Catálogo de ejercicios de OneRM',
        },
      },
    });
  });

  it('RN-CAT-03: muscles map to ours without repeats, and a primary is not also secondary', () => {
    const row = base({
      targetMuscles: ['lats', 'middle-back', 'upper-back'],
      secondaryMuscles: ['traps', 'rear-delts', 'biceps'],
    });
    expect(mapOnermV1Variant(variant({ base: row }))).toMatchObject({
      ok: true,
      candidate: { primaryMuscles: ['back'], secondaryMuscles: ['shoulders', 'biceps'] },
    });
  });

  it('RN-CAT-03: secondaries without an equivalent are left out', () => {
    const row = base({ targetMuscles: ['abs'], secondaryMuscles: ['hip-flexors', 'obliques'] });
    expect(mapOnermV1Variant(variant({ base: row }))).toMatchObject({
      ok: true,
      candidate: { primaryMuscles: ['abs'], secondaryMuscles: [] },
    });
  });

  it.each([
    ['ez-bar', 'barbell'],
    ['trap-bar', 'barbell'],
    ['landmine', 'barbell'],
    ['selectorized-machine', 'machine'],
    ['plate-loaded-machine', 'machine'],
    ['smith-machine', 'machine'],
    ['weight-plate', 'dumbbell'],
    ['cable', 'cable'],
    ['kettlebell', 'kettlebell'],
  ] as const)('RN-CAT-03: %s is %s, with external load', (equipment, ours) => {
    expect(mapOnermV1Variant(variant({ equipment }))).toMatchObject({
      ok: true,
      candidate: { loadType: 'external', primaryEquipment: ours, equipment: [ours] },
    });
  });

  it.each(['bodyweight', 'suspension-trainer', 'ab-wheel', 'stability-ball'] as const)(
    'ADR-0005: %s is a bodyweight exercise',
    (equipment) => {
      expect(mapOnermV1Variant(variant({ equipment }))).toMatchObject({
        ok: true,
        candidate: { loadType: 'bodyweight', primaryEquipment: 'bodyweight' },
      });
    },
  );

  it('names the bodyweight variant after the base alone', () => {
    const pushUp = base({ es: 'Flexión de brazos', en: 'Push-up', aliases: ['Lagartija'] });
    expect(mapOnermV1Variant(variant({ base: pushUp, equipment: 'bodyweight' }))).toMatchObject({
      ok: true,
      candidate: { name: 'Flexión de brazos', aliases: ['Push-up', 'Lagartija'] },
    });
  });

  it('ADR-0008: unilateral and alternating variants are unilateral; one dumbbell is singular', () => {
    const row = base({ es: 'Remo a una mano', en: 'Single-arm row' });
    expect(
      mapOnermV1Variant(variant({ base: row, equipment: 'dumbbell', laterality: 'unilateral' })),
    ).toMatchObject({
      ok: true,
      candidate: { name: 'Remo a una mano con mancuerna', isUnilateral: true },
    });
    expect(
      mapOnermV1Variant(variant({ equipment: 'dumbbell', laterality: 'alternating' })),
    ).toMatchObject({
      ok: true,
      candidate: { name: 'Press de banca con mancuernas', isUnilateral: true },
    });
  });

  it('ADR-0005: rejects the band variants with a reason', () => {
    expect(mapOnermV1Variant(variant({ equipment: 'resistance-band' }))).toEqual({
      ok: false,
      externalId: 'barbell-bench-press',
      reason: expect.stringContaining('resistance-band'),
    });
  });

  it('RN-CAT-03: rejects an exercise without a primary muscle of ours, with a reason', () => {
    const neck = base({ targetMuscles: ['neck'], secondaryMuscles: [] });
    expect(mapOnermV1Variant(variant({ base: neck }))).toEqual({
      ok: false,
      externalId: 'barbell-bench-press',
      reason: expect.stringContaining('neck'),
    });
  });
});
