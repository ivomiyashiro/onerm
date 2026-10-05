import type { Exercise } from '@/domain/models/exercise';
import type { LoadIncrements, Profile } from '@/domain/models/profile';
import type { LoadUnit } from '@/domain/models/vocabulary';
import type { LoadGrid } from '@/domain/rules/suggestion/load-grid';

/** RN-PERF-06: the default increments, one map per unit (*criterio de práctica*). */
export const DEFAULT_LOAD_INCREMENTS: Readonly<Record<LoadUnit, LoadIncrements>> = {
  kg: { barbell: 2.5, dumbbell: 2, cable: 2.5, machine: 5, kettlebell: 4 },
  lb: { barbell: 5, dumbbell: 5, cable: 5, machine: 10, kettlebell: 10 },
};

/**
 * The grid of an exercise for the profile (RN-SUG-09): the increment of its primary equipment in
 * the active unit (RN-PERF-06), and the minimum load: the bar weight for a barbell, one increment
 * otherwise (RN-PERF-08). Bodyweight has none. An exercise not in the local catalog yet uses the
 * default barbell increment (RN-CAT-04).
 */
export function loadGridFor(
  profile: Pick<
    Profile,
    'unit' | 'loadIncrementsKg' | 'loadIncrementsLb' | 'barWeightKg' | 'barWeightLb'
  >,
  exercise: Pick<Exercise, 'primaryEquipment'> | null,
): LoadGrid | null {
  const { unit } = profile;
  if (exercise === null) {
    const increment = DEFAULT_LOAD_INCREMENTS[unit].barbell;
    return { unit, increment, minLoad: increment };
  }
  const equipment = exercise.primaryEquipment;
  if (equipment === 'bodyweight') return null;
  const increment = (unit === 'kg' ? profile.loadIncrementsKg : profile.loadIncrementsLb)[
    equipment
  ];
  const barWeight = unit === 'kg' ? profile.barWeightKg : profile.barWeightLb;
  return { unit, increment, minLoad: equipment === 'barbell' ? barWeight : increment };
}
