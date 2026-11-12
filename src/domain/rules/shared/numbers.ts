/** A whole number in `[min, max]`. */
export function isWholeBetween(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}
