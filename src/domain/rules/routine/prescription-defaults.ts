import type { Prescription } from '@/domain/models/prescription';
import type {
  ExerciseRole,
  ExperienceLevel,
  Mechanic,
  TrainingGoal,
} from '@/domain/models/vocabulary';

interface GoalParameters {
  readonly repRange: { readonly min: number; readonly max: number };
  readonly noviceRir: number;
  /** Intermediate and advanced behave the same (RN-PERF-07). */
  readonly intermediateRir: number;
  readonly restSeconds: number;
}

/** 11 §2: the parameters by goal and role. Templates never use RIR 0 (P-05). */
const PARAMETERS: Record<TrainingGoal, Record<ExerciseRole, GoalParameters>> = {
  health: {
    main: { repRange: { min: 8, max: 12 }, noviceRir: 3, intermediateRir: 2, restSeconds: 120 },
    accessory: {
      repRange: { min: 10, max: 15 },
      noviceRir: 3,
      intermediateRir: 2,
      restSeconds: 90,
    },
  },
  hypertrophy: {
    // Intermediate: 1–2, 2 by default.
    main: { repRange: { min: 6, max: 10 }, noviceRir: 2, intermediateRir: 2, restSeconds: 150 },
    accessory: {
      repRange: { min: 10, max: 15 },
      noviceRir: 2,
      intermediateRir: 1,
      restSeconds: 90,
    },
  },
  strength: {
    main: { repRange: { min: 4, max: 6 }, noviceRir: 3, intermediateRir: 2, restSeconds: 180 },
    accessory: {
      repRange: { min: 8, max: 12 },
      noviceRir: 3,
      intermediateRir: 2,
      restSeconds: 120,
    },
  },
};

/** C-10: with the strength goal, at most 3 sets per exercise and session. */
const STRENGTH_MAX_SETS = 3;

/**
 * RN-PERF-03: the prescription of a template or routine exercise for the profile's goal and
 * level (11 §2). Used to adopt a template, to add an exercise and for «Ajustar mi rutina» (D06).
 */
export function prescriptionFor(
  exercise: { readonly role: ExerciseRole; readonly sets: number },
  profile: { readonly goal: TrainingGoal; readonly level: ExperienceLevel },
): Prescription {
  const parameters = PARAMETERS[profile.goal][exercise.role];
  return {
    role: exercise.role,
    sets: profile.goal === 'strength' ? Math.min(exercise.sets, STRENGTH_MAX_SETS) : exercise.sets,
    repRange: parameters.repRange,
    restSeconds: parameters.restSeconds,
    targetRir: profile.level === 'novice' ? parameters.noviceRir : parameters.intermediateRir,
  };
}

/** RN-PERF-03: the role comes from the mechanic, and the sets from the role. Both are editable. */
export function defaultRoleAndSets(mechanic: Mechanic): { role: ExerciseRole; sets: number } {
  return mechanic === 'compound' ? { role: 'main', sets: 3 } : { role: 'accessory', sets: 2 };
}
