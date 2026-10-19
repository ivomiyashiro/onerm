import type { Exercise } from '@/domain/models/exercise';
import type { LocalDate } from '@/domain/models/local-date';
import type { Id } from '@/domain/models/vocabulary';
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
 * RN-ENT-13 (D2): the bilateral dumbbell exercises held with one dumbbell. Every other one is
 * loaded per dumbbell with two of them (RN-ENT-05), so its load counts twice.
 */
export const ONE_DUMBBELL_SLUGS: ReadonlySet<string> = new Set(['sentadilla-goblet-mancuerna']);

/**
 * RN-ENT-13: the total load (tonnage) of a workout, load × reps of its effective sets; a
 * unilateral set adds both sides and a bilateral one with two dumbbells counts both (D2).
 * Bodyweight sets and sets at 0 kg have no load and add nothing: null when no effective set has
 * one. Not the weekly volume (RN-PROG-04). `exerciseOf` gives the catalog entry of each exercise.
 */
export function totalLoadKg(
  workout: Pick<Workout, 'exercises'>,
  exerciseOf: (exerciseId: Id) => Pick<Exercise, 'slug' | 'primaryEquipment'> | undefined = () =>
    undefined,
): number | null {
  let total: number | null = null;
  for (const exercise of workout.exercises) {
    const entry = exerciseOf(exercise.exerciseId);
    const twoDumbbells =
      entry?.primaryEquipment === 'dumbbell' && !ONE_DUMBBELL_SLUGS.has(entry.slug);
    for (const set of exercise.sets.filter(isEffectiveSet)) {
      if (set.loadKg === null || set.loadKg <= 0) continue;
      const reps = set.isUnilateral ? set.repsLeft + set.repsRight : set.reps;
      const dumbbells = twoDumbbells && !set.isUnilateral ? 2 : 1;
      total = (total ?? 0) + set.loadKg * reps * dumbbells;
    }
  }
  return total;
}

/** RF-ENT-01.AC8: this week in S07, Monday (0) to Sunday (6). */
export interface WeekProgress {
  /** Days trained from Monday to today: two workouts on one day count once (D3), like the goal. */
  readonly done: number;
  /** The days with at least one finished workout, in order. */
  readonly doneDays: readonly number[];
  readonly today: number;
}

/**
 * RF-ENT-01.AC8: the days trained this week, Monday to `today` (RN-GEN-01), and which ones,
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
  const doneDays = [...new Set(days)].sort((a, b) => a - b);
  return {
    done: doneDays.length,
    doneDays,
    today: daysBetween(monday, today),
  };
}
