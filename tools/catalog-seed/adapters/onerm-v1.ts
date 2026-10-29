import type { ExerciseAttribution } from '@/domain/models/exercise';
import type { Equipment, LoadType, Muscle } from '@/domain/models/vocabulary';

import {
  ONERM_V1_VARIANTS,
  type Laterality,
  type SourceEquipment,
  type SourceMuscle,
  type SourceVariant,
} from '../onerm-v1/catalog';
import type { ExerciseSourceAdapter, MapResult } from '../types';

/** v1 muscles to our vocabulary (RN-CAT-03). The ones without an equivalent are null. */
const MUSCLES: Readonly<Record<SourceMuscle, Muscle | null>> = {
  chest: 'chest',
  'upper-chest': 'chest',
  'mid-chest': 'chest',
  'lower-chest': 'chest',
  serratus: 'chest',
  back: 'back',
  lats: 'back',
  traps: 'back',
  'upper-back': 'back',
  'middle-back': 'back',
  'lower-back': 'back',
  shoulders: 'shoulders',
  'front-delts': 'shoulders',
  'side-delts': 'shoulders',
  'rear-delts': 'shoulders',
  'rotator-cuff': 'shoulders',
  arms: null,
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'forearms',
  legs: null,
  quads: 'quads',
  hamstrings: 'hamstrings',
  glutes: 'glutes',
  adductors: 'adductors',
  abductors: 'glutes',
  'hip-flexors': null,
  calves: 'calves',
  tibialis: null,
  core: 'abs',
  abs: 'abs',
  obliques: 'abs',
  neck: null,
};

interface EquipmentMapping {
  readonly equipment: Equipment;
  readonly loadType: LoadType;
  /** What follows the base in the Spanish name; empty for bodyweight. */
  readonly es: string;
  readonly en: string;
}

const external = (equipment: Equipment, es: string, en: string): EquipmentMapping => ({
  equipment,
  loadType: 'external',
  es,
  en,
});
const bodyweight = (es: string, en: string): EquipmentMapping => ({
  equipment: 'bodyweight',
  loadType: 'bodyweight',
  es,
  en,
});

/**
 * v1 equipment to ours. `primaryEquipment` sets the increment (RN-PERF-06): the bars go as a
 * barbell, the Smith machine as a machine and a plate in the hand as a dumbbell. A band has no load
 * the engine can progress (ADR-0005), so it is null and rejected.
 */
const EQUIPMENT: Readonly<Record<SourceEquipment, EquipmentMapping | null>> = {
  bodyweight: bodyweight('', ''),
  barbell: external('barbell', 'con barra', 'Barbell'),
  dumbbell: external('dumbbell', 'con mancuernas', 'Dumbbell'),
  'ez-bar': external('barbell', 'con barra EZ', 'EZ bar'),
  cable: external('cable', 'en polea', 'Cable'),
  'selectorized-machine': external('machine', 'en máquina', 'Machine'),
  'plate-loaded-machine': external('machine', 'en máquina de discos', 'Plate-loaded'),
  'smith-machine': external('machine', 'en máquina Smith', 'Smith machine'),
  kettlebell: external('kettlebell', 'con kettlebell', 'Kettlebell'),
  'resistance-band': null,
  'trap-bar': external('barbell', 'con barra hexagonal', 'Trap bar'),
  landmine: external('barbell', 'en landmine', 'Landmine'),
  'suspension-trainer': bodyweight('en suspensión', 'Suspension'),
  'weight-plate': external('dumbbell', 'con disco', 'Plate'),
  'ab-wheel': bodyweight('con rueda', 'Ab wheel'),
  'stability-ball': bodyweight('con pelota de estabilidad', 'Stability ball'),
};

const ATTRIBUTION: ExerciseAttribution = {
  source: 'OneRM',
  license: 'Catálogo propio',
  attribution: 'Catálogo de ejercicios de OneRM',
};

const mapMuscles = (muscles: readonly SourceMuscle[]): Muscle[] => [
  ...new Set(muscles.map((muscle) => MUSCLES[muscle]).filter((muscle) => muscle !== null)),
];

/** One dumbbell when only one side works at a time. */
function spanishName(es: string, mapping: EquipmentMapping, laterality: Laterality): string {
  const suffix =
    mapping.es === 'con mancuernas' && laterality === 'unilateral' ? 'con mancuerna' : mapping.es;
  return suffix === '' ? es : `${es} ${suffix}`;
}

const englishName = (en: string, mapping: EquipmentMapping) =>
  mapping.en === '' ? en : `${mapping.en} ${en.charAt(0).toLowerCase()}${en.slice(1)}`;

export function mapOnermV1Variant(variant: SourceVariant): MapResult {
  const { base, equipment, laterality } = variant;
  const mapping = EQUIPMENT[equipment];
  if (!mapping) {
    return {
      ok: false,
      externalId: variant.slug,
      reason: `equipment "${equipment}" has no load the engine can progress (ADR-0005)`,
    };
  }
  const primaryMuscles = mapMuscles(base.targetMuscles);
  if (primaryMuscles.length === 0) {
    return {
      ok: false,
      externalId: variant.slug,
      reason: `no primary muscle of ours for "${base.targetMuscles.join(', ')}" (RN-CAT-03)`,
    };
  }
  return {
    ok: true,
    candidate: {
      source: 'onerm-v1',
      externalId: variant.slug,
      name: spanishName(base.es, mapping, laterality),
      aliases: [englishName(base.en, mapping), ...base.aliases],
      loadType: mapping.loadType,
      primaryMuscles,
      secondaryMuscles: mapMuscles(base.secondaryMuscles).filter(
        (muscle) => !primaryMuscles.includes(muscle),
      ),
      primaryEquipment: mapping.equipment,
      equipment: [mapping.equipment],
      mechanic: base.mechanic,
      isUnilateral: laterality !== 'bilateral',
      attribution: ATTRIBUTION,
    },
  };
}

/** The catalog of OneRM v1, copied into the repo (`onerm-v1/catalog.ts`): no API needed. */
export function onermV1Adapter(
  variants: readonly SourceVariant[] = ONERM_V1_VARIANTS,
): ExerciseSourceAdapter {
  return {
    sourceId: 'onerm-v1',
    async *extract() {
      yield* variants;
    },
    map: (raw) => mapOnermV1Variant(raw as SourceVariant),
  };
}
