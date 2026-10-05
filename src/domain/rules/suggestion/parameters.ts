/**
 * RN-SUG-00: every number of the engine, named in one place. Percentages are fractions
 * (0.05 = 5 %). The basis of each one is in the specification table (P-06, P-10 to P-13).
 */
export const SUGGESTION_PARAMETERS = {
  LOAD_INCREASE: 0.05,
  LOAD_INCREASE_HIGH: 0.1,
  /** If the smallest jump available is bigger, reps go first (REP_OVERSHOOT). */
  MAX_JUMP_WITHOUT_OVERSHOOT: 0.1,
  /** Reps over the cap. */
  REP_OVERSHOOT: 2,
  DELOAD: 0.1,
  /** Exposures. */
  STAGNATION_THRESHOLD: 3,
  /** Exposures. */
  SUSTAINED_SIGNAL: 2,
  /** RIR. */
  EFFORT_DEVIATION: 2,
  /** RIR; cap of the simple scale (RN-ENT-03). */
  SIMPLE_SCALE_MAX_RIR: 4,
  MAX_CONSECUTIVE_CONSOLIDATIONS: 1,
  /** An inactivity gap of more than `gapDays` local days lowers the load by `decrease`. */
  REENTRY_1: { gapDays: 21, decrease: 0.1 },
  REENTRY_2: { gapDays: 42, decrease: 0.2 },
  /** Reps to failure. */
  E1RM_STANDARD_MAX: 10,
  /** Reps to failure. */
  E1RM_MAX: 15,
  CALIBRATION_STEP_UP: 0.2,
  CALIBRATION_STEP_DOWN: 0.2,
} as const;
