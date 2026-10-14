import { createHash } from 'node:crypto';

import type { ExerciseRecord, ExercisesFile } from '@/data/catalog/exercises-file';
import type { Exercise } from '@/domain/models/exercise';

export type { ExerciseRecord, ExercisesFile };

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
