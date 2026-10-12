import type { Profile } from '@/domain/models/profile';
import type { Routine } from '@/domain/models/routine';
import type { RoutineTemplate } from '@/domain/models/routine-template';
import { prescriptionFor } from '@/domain/rules/routine/prescription-defaults';
import type { Prescription } from '@/domain/models/prescription';

/** C-06: the time of one set, without the rest. */
const SECONDS_PER_SET = 40;

/**
 * C-06 (11 §1): the estimated minutes of a session, 40 s per set plus its rest, without the
 * warm-up or the changes between machines. Rounded to the nearest minute.
 */
export function sessionMinutes(prescriptions: readonly Prescription[]): number {
  const seconds = prescriptions.reduce(
    (total, { sets, restSeconds }) => total + sets * (SECONDS_PER_SET + restSeconds),
    0,
  );
  return Math.round(seconds / 60);
}

/** C-06: a routine is as long as its longest day. */
export function routineMinutes(routine: Routine): number {
  return Math.max(
    0,
    ...routine.days.map((day) => sessionMinutes(day.exercises.map((e) => e.prescription))),
  );
}

/** C-06 with the prescription the template would get for this profile (RN-PERF-03). */
export function templateMinutes(
  template: RoutineTemplate,
  profile: Pick<Profile, 'goal' | 'level'>,
): number {
  return Math.max(
    0,
    ...template.days.map((day) =>
      sessionMinutes(day.exercises.map((exercise) => prescriptionFor(exercise, profile))),
    ),
  );
}
