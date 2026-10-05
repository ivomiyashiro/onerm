interface Positioned {
  readonly id: string;
  readonly position: number;
}

/**
 * I-10: order by `(position, id)`. Two devices can reorder at once and leave repeated positions;
 * the id breaks the tie so every device shows the same order. Ids are compared by code unit, not
 * with `localeCompare`, so the result doesn't depend on the device language.
 */
export function byPosition(a: Positioned, b: Positioned): number {
  if (a.position !== b.position) return a.position - b.position;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

/** A sorted copy (I-10); the input is left as it is. */
export function sortByPosition<T extends Positioned>(items: readonly T[]): T[] {
  return [...items].sort(byPosition);
}
