interface Finished {
  readonly finishedAt: Date;
}

/** A copy ordered by `finishedAt`, the order the engine reads the history in (RN-SUG-01). */
export function byFinishedAt<T extends Finished>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.finishedAt.getTime() - b.finishedAt.getTime());
}

/**
 * In a list ordered by `finishedAt`, the index of the first item finished at or after `instant`
 * (binary search). With `strict`, the first finished after it.
 */
export function firstFinishedFrom<T extends Finished>(
  ordered: readonly T[],
  instant: Date,
  strict = false,
): number {
  const time = instant.getTime();
  let low = 0;
  let high = ordered.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    const at = ordered[middle].finishedAt.getTime();
    if (at < time || (strict && at === time)) low = middle + 1;
    else high = middle;
  }
  return low;
}
