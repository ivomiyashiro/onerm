import { createHash } from 'node:crypto';

import type { ExerciseRecord, ExercisesFile } from '@/data/catalog/exercises-file';
import type { Exercise } from '@/domain/models/exercise';

export type { ExerciseRecord, ExercisesFile };

export function toRecord(exercise: Exercise): ExerciseRecord {
  return { ...exercise, deprecatedAt: exercise.deprecatedAt?.toISOString() ?? null };
}

/** What the load type, the laterality and the increment of an exercise depend on (RN-CAT-05). */
const KEY_ATTRIBUTES = ['loadType', 'isUnilateral', 'primaryEquipment'] as const;

/**
 * RN-CAT-05: a routine and a history refer to an exercise by its id and rely on how it is loaded.
 * Changing one of these for a published id would silently change them: a new id is needed.
 */
function assertKeyAttributesKept(exercises: readonly Exercise[], previous: ExercisesFile): void {
  const before = new Map(previous.exercises.map((exercise) => [exercise.id, exercise]));
  const changes = exercises.flatMap((exercise) => {
    const old = before.get(exercise.id);
    if (!old) return [];
    return KEY_ATTRIBUTES.filter((key) => old[key] !== exercise[key]).map(
      (key) =>
        `${exercise.slug} (${exercise.id}): ${key} ${String(old[key])} → ${String(exercise[key])}`,
    );
  });
  if (changes.length > 0) {
    throw new Error(
      `RN-CAT-05: these attributes can't change for a published id; use a new exercise:\n${changes.join('\n')}`,
    );
  }
}

/**
 * The same exercises give the same file, version included, so running the seed twice changes
 * nothing; a change in any exercise bumps the version by one.
 */
export function buildExercisesFile(
  exercises: readonly Exercise[],
  previous: ExercisesFile,
): ExercisesFile {
  assertKeyAttributesKept(exercises, previous);
  const records = exercises.map(toRecord);
  const contentHash = createHash('sha256')
    .update(JSON.stringify(records))
    .digest('hex')
    .slice(0, 16);
  if (contentHash === previous.contentHash) return previous;
  return { version: previous.version + 1, contentHash, exercises: records };
}
