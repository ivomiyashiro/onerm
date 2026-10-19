/**
 * Whether two query results hold the same data (#230): plain objects and arrays compared field by
 * field, plus the `Date`, `Set` and `Map` the mappers build. A re-read that gives the same data
 * isn't emitted, so a write a screen doesn't see doesn't render it again.
 */
export function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  if (a instanceof Date) return a.getTime() === (b as Date).getTime();
  if (a instanceof Set) {
    const other = b as Set<unknown>;
    return a.size === other.size && [...a].every((value) => other.has(value));
  }
  if (a instanceof Map) {
    const other = b as Map<unknown, unknown>;
    return (
      a.size === other.size &&
      [...a].every(([key, value]) => other.has(key) && sameValue(value, other.get(key)))
    );
  }
  if (Array.isArray(a)) {
    const other = b as unknown[];
    return a.length === other.length && a.every((value, i) => sameValue(value, other[i]));
  }
  const keys = Object.keys(a);
  const other = b as Record<string, unknown>;
  return (
    keys.length === Object.keys(other).length &&
    keys.every(
      (key) =>
        Object.hasOwn(other, key) && sameValue((a as Record<string, unknown>)[key], other[key]),
    )
  );
}
