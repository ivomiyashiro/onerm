/** RN-GEN-02 tolerance: absorbs the rounding of the kg ↔ lb conversion. */
export const LOAD_EQUALITY_TOLERANCE_KG = 0.05;

// In floating point 60.05 - 60 = 0.04999999999999716: without this margin, a difference
// of exactly 0.05 kg would count as equal.
const FLOAT_EPSILON = 1e-9;

/** RN-GEN-02: two loads (in kg) are equal if they differ by less than 0.05 kg. */
export function areLoadsEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < LOAD_EQUALITY_TOLERANCE_KG - FLOAT_EPSILON;
}
