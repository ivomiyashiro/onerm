import type { ExerciseCandidate, ExerciseSourceAdapter } from '../types';

/**
 * Our own exercises, from a versioned file in the repo (ADR-0004 §2): no API needed. The file
 * already holds candidates, so `map` only passes them through.
 */
export function manualAdapter(entries: readonly ExerciseCandidate[]): ExerciseSourceAdapter {
  return {
    sourceId: 'manual',
    async *extract() {
      yield* entries;
    },
    map: (raw) => ({ ok: true, candidate: raw as ExerciseCandidate }),
  };
}
