import type { Routine } from '@/domain/models/routine';
import { isWholeBetween } from '@/domain/rules/numbers';
import {
  validatePrescription,
  type PrescriptionViolationCode,
} from '@/domain/rules/prescription-rules';
import type { Violation } from '@/domain/rules/violation';

/** RN-RUT-05 limits. */
export const ROUTINE_LIMITS = {
  nameLength: { min: 1, max: 50 },
  days: { min: 1, max: 7 },
  exercisesPerDay: { min: 1, max: 20 },
} as const;

export type RoutineViolationCode =
  'routine.name' | 'routine.days' | 'day.name' | 'day.exercises' | PrescriptionViolationCode;

/** Length in characters (code points), without the spaces at the edges. */
function nameLength(name: string): number {
  return Array.from(name.trim()).length;
}

/** I-02 and I-03: what a routine needs to be saved (RN-RUT-05, RN-RUT-04). */
export function validateRoutine(routine: Routine): Violation<RoutineViolationCode>[] {
  const { nameLength: nameLimits, days, exercisesPerDay } = ROUTINE_LIMITS;
  const violations: Violation<RoutineViolationCode>[] = [];

  if (!isWholeBetween(nameLength(routine.name), nameLimits.min, nameLimits.max)) {
    violations.push({ code: 'routine.name', path: ['name'] });
  }
  if (!isWholeBetween(routine.days.length, days.min, days.max)) {
    violations.push({ code: 'routine.days', path: ['days'] });
  }
  routine.days.forEach((day, dayIndex) => {
    if (nameLength(day.name) === 0) {
      violations.push({ code: 'day.name', path: ['days', dayIndex, 'name'] });
    }
    if (!isWholeBetween(day.exercises.length, exercisesPerDay.min, exercisesPerDay.max)) {
      violations.push({ code: 'day.exercises', path: ['days', dayIndex, 'exercises'] });
    }
    day.exercises.forEach((exercise, exerciseIndex) => {
      violations.push(
        ...validatePrescription(exercise.prescription, [
          'days',
          dayIndex,
          'exercises',
          exerciseIndex,
        ]),
      );
    });
  });
  return violations;
}
