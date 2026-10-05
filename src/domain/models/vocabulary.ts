/**
 * Controlled vocabularies of the domain (glossary, RN-CAT-03, ADR-0004, ADR-0005). The arrays
 * keep the values in one place for the filters, the database CHECKs and the seed; the types
 * are derived from them.
 */

/** RN-CAT-03, in the order of the specification. */
export const MUSCLES = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'adductors',
] as const;
export type Muscle = (typeof MUSCLES)[number];

/** RN-CAT-03. `primaryEquipment` defines the load increment (RN-PERF-06). */
export const EQUIPMENT = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

/** ADR-0005: the MVP only supports external load and bodyweight. */
export const LOAD_TYPES = ['external', 'bodyweight'] as const;
export type LoadType = (typeof LOAD_TYPES)[number];

/** ADR-0004. Adding an exercise to a routine takes its role from it (RN-PERF-03). */
export const MECHANICS = ['compound', 'isolation'] as const;
export type Mechanic = (typeof MECHANICS)[number];

export const EXERCISE_ROLES = ['main', 'accessory'] as const;
export type ExerciseRole = (typeof EXERCISE_ROLES)[number];

/** RN-PERF-07: intermediate and advanced behave the same in the MVP. */
export type ExperienceLevel = 'novice' | 'intermediate' | 'advanced';

export type TrainingGoal = 'health' | 'hypertrophy' | 'strength';

/** Only affects display and input: loads are always stored in kg (RN-PERF-05). */
export type LoadUnit = 'kg' | 'lb';

export type EffortMode = 'simple' | 'rir';

/** Entity identifier, generated on the client (RN-SYNC-02). */
export type Id = string;
