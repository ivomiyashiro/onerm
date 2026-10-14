import { createHash } from 'node:crypto';

import type { Exercise } from '@/domain/models/exercise';

/** An exercise as stored in the snapshot file: JSON has no Date. */
export type ExerciseRecord = Omit<Exercise, 'deprecatedAt'> & {
  readonly deprecatedAt: string | null;
};

/** The snapshot included in the app (ADR-0004 §3 «export», RF-CAT-03). */
export interface ExercisesFile {
  /** Whole and increasing: the app loads a snapshot only when it is newer (load-catalog-snapshot). */
  readonly version: number;
  /** Hash of the exercises: the version only goes up when the content changes. */
  readonly contentHash: string;
  readonly exercises: readonly ExerciseRecord[];
}

export function toRecord(exercise: Exercise): ExerciseRecord {
  return { ...exercise, deprecatedAt: exercise.deprecatedAt?.toISOString() ?? null };
}

/**
 * The same exercises give the same file, version included, so running the seed twice changes
 * nothing; a change in any exercise bumps the version by one.
 */
export function buildExercisesFile(
  exercises: readonly Exercise[],
  previous: ExercisesFile,
): ExercisesFile {
  const records = exercises.map(toRecord);
  const contentHash = createHash('sha256')
    .update(JSON.stringify(records))
    .digest('hex')
    .slice(0, 16);
  if (contentHash === previous.contentHash) return previous;
  return { version: previous.version + 1, contentHash, exercises: records };
}
