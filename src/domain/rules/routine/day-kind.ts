import type { Muscle } from '@/domain/models/vocabulary';

/** The kind of a routine day, for its photo on Inicio (marca §9). */
export type DayKind = 'lower' | 'upper' | 'fullBody';

const LOWER: readonly Muscle[] = ['quads', 'hamstrings', 'glutes', 'calves', 'adductors'];
const UPPER: readonly Muscle[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms'];

/**
 * From the primary muscles of each exercise of the day: only lower body is a leg day, only upper
 * body an upper-body day, anything else (both, or nothing known) full body. Abs count for neither.
 */
export function dayKind(primaryMuscles: readonly (readonly Muscle[])[]): DayKind {
  const muscles = primaryMuscles.flat();
  const lower = muscles.some((m) => LOWER.includes(m));
  const upper = muscles.some((m) => UPPER.includes(m));
  if (lower && !upper) return 'lower';
  if (upper && !lower) return 'upper';
  return 'fullBody';
}
