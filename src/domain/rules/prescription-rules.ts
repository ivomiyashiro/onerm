import type { Prescription } from '@/domain/models/prescription';
import { isWholeBetween } from '@/domain/rules/numbers';
import type { Violation } from '@/domain/rules/violation';

/** RN-RUT-04 limits. */
export const PRESCRIPTION_LIMITS = {
  sets: { min: 1, max: 10 },
  reps: { min: 1, max: 30 },
  restSeconds: { min: 30, max: 600, step: 15 },
  targetRir: { min: 0, max: 5 },
} as const;

export type PrescriptionViolationCode =
  | 'prescription.sets'
  | 'prescription.repMin'
  | 'prescription.repMax'
  | 'prescription.restSeconds'
  | 'prescription.targetRir';

/**
 * I-03, RN-RUT-04: the limits of a prescription, all whole numbers. RIR 0 is valid: only
 * templates avoid it (P-05), and the user gets an informative warning, not an error.
 */
export function validatePrescription(
  prescription: Prescription,
  path: readonly (string | number)[] = [],
): Violation<PrescriptionViolationCode>[] {
  const { sets, reps, restSeconds, targetRir } = PRESCRIPTION_LIMITS;
  const { min, max } = prescription.repRange;
  const at = (...fields: string[]) => [...path, 'prescription', ...fields];
  const violations: Violation<PrescriptionViolationCode>[] = [];

  if (!isWholeBetween(prescription.sets, sets.min, sets.max)) {
    violations.push({ code: 'prescription.sets', path: at('sets') });
  }
  if (!isWholeBetween(min, reps.min, reps.max)) {
    violations.push({ code: 'prescription.repMin', path: at('repRange', 'min') });
  }
  // The cap goes from the floor to 30; with an invalid floor, from the lowest valid one.
  if (!isWholeBetween(max, Math.max(min, reps.min), reps.max)) {
    violations.push({ code: 'prescription.repMax', path: at('repRange', 'max') });
  }
  if (
    !isWholeBetween(prescription.restSeconds, restSeconds.min, restSeconds.max) ||
    prescription.restSeconds % restSeconds.step !== 0
  ) {
    violations.push({ code: 'prescription.restSeconds', path: at('restSeconds') });
  }
  if (!isWholeBetween(prescription.targetRir, targetRir.min, targetRir.max)) {
    violations.push({ code: 'prescription.targetRir', path: at('targetRir') });
  }
  return violations;
}
