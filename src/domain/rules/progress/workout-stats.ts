import type { LocalDate } from '@/domain/models/local-date';
import type { Workout } from '@/domain/models/workout';
import { daysBetween, startOfWeek } from '@/domain/rules/calendar';
import { isEffectiveSet } from '@/domain/rules/workout-set-rules';

/** Whole minutes from start to finish; never negative, even after a correction. */
export function workoutMinutes(workout: Pick<Workout, 'startedAt' | 'finishedAt'>): number {
  if (workout.finishedAt === null) return 0;
  return Math.max(
    0,
    Math.round((workout.finishedAt.getTime() - workout.startedAt.getTime()) / 60_000),
  );
}

/** The effective sets of a workout (RN-SUG-01): what S12, S18 and S19 count as «series». */
export function effectiveSets(workout: Pick<Workout, 'exercises'>): number {
  return workout.exercises.reduce((n, e) => n + e.sets.filter(isEffectiveSet).length, 0);
}

/**
 * RN-ENT-13: the total load (tonnage) of a workout, load × reps of its effective sets; a
 * unilateral set adds both sides. Bodyweight sets have no load and add nothing: null when no
 * effective set has one. Not the weekly volume (RN-PROG-04).
 */
export function totalLoadKg(workout: Pick<Workout, 'exercises'>): number | null {
  let total: number | null = null;
  for (const set of workout.exercises.flatMap((e) => e.sets).filter(isEffectiveSet)) {
    if (set.loadKg === null) continue;
    const reps = set.isUnilateral ? set.repsLeft + set.repsRight : set.reps;
    total = (total ?? 0) + set.loadKg * reps;
  }
  return total;
}

/** RF-ENT-01.AC8: this week in S07, Monday (0) to Sunday (6). */
export interface WeekProgress {
  /** Workouts finished from Monday to today. */
  readonly done: number;
  /** The days with at least one of them, in order. */
  readonly doneDays: readonly number[];
  readonly today: number;
}

/**
 * RF-ENT-01.AC8: the workouts finished this week, Monday to `today` (RN-GEN-01), and on which days,
 * for the week strip of S07.
 */
export function weekProgress(
  finished: readonly Pick<Workout, 'finishedAt'>[],
  today: LocalDate,
  localDate: (instant: Date) => LocalDate,
): WeekProgress {
  const monday = startOfWeek(today);
  const days = finished
    .filter((w) => w.finishedAt !== null)
    .map((w) => localDate(w.finishedAt!))
    .filter((day) => day >= monday && day <= today)
    .map((day) => daysBetween(monday, day));
  return {
    done: days.length,
    doneDays: [...new Set(days)].sort((a, b) => a - b),
    today: daysBetween(monday, today),
  };
}
