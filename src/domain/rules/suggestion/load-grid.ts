import type { LoadUnit } from '@/domain/models/vocabulary';
import { areLoadsEqual } from '@/domain/rules/load-equality';
import { fromUnit, toUnit } from '@/domain/rules/units';

/**
 * The multiples of the exercise increment in the user unit (RN-SUG-09, RN-PERF-06), and the
 * minimum load (RN-PERF-08). `increment` and `minLoad` are in `unit`, like the profile stores them.
 */
export interface LoadGrid {
  readonly unit: LoadUnit;
  readonly increment: number;
  readonly minLoad: number;
}

/** The multiples right below and above a load, in the unit of the grid. */
function neighbours(kg: number, grid: LoadGrid): { value: number; lower: number; upper: number } {
  const value = toUnit(kg, grid.unit);
  const lower = Math.floor(value / grid.increment) * grid.increment;
  return { value, lower, upper: lower + grid.increment };
}

/** Membership uses the tolerance of RN-GEN-02, measured in kg. */
function isSame(a: number, b: number, unit: LoadUnit): boolean {
  return areLoadsEqual(fromUnit(a, unit), fromUnit(b, unit));
}

/**
 * Which neighbour is closer. A load in lb comes from `kg / 0.45359237`, so an exact half can land
 * a hair to either side (367.49999999999994): within 1e-9 it counts as a half, and `halfUp` decides.
 */
function closer(value: number, lower: number, upper: number, halfUp: boolean): number {
  const difference = value - lower - (upper - value);
  if (Math.abs(difference) < 1e-9) return halfUp ? upper : lower;
  return difference < 0 ? lower : upper;
}

/**
 * The lowest load the engine suggests (RN-PERF-08): the minimum load, or the first multiple above
 * it when it isn't on the grid (a 7 kg bar with 2.5 kg increments → 7.5), so every suggestion stays
 * on the grid (RN-SUG-09). Within the RN-GEN-02 tolerance it counts as that multiple.
 */
function lowestLoad(grid: LoadGrid): number {
  const lower = Math.floor(grid.minLoad / grid.increment) * grid.increment;
  if (isSame(grid.minLoad, lower, grid.unit)) return lower;
  return lower + grid.increment;
}

/** Back to kg, never under the lowest load (RN-PERF-08). */
function toLoad(value: number, grid: LoadGrid): number {
  return fromUnit(Math.max(value, lowestLoad(grid)), grid.unit);
}

/** Estimates (RN-SUG-06, RN-SUG-08): the multiple at or below the load. */
export function floorToGrid(kg: number, grid: LoadGrid): number {
  const { value, lower, upper } = neighbours(kg, grid);
  return toLoad(isSame(value, upper, grid.unit) ? upper : lower, grid);
}

/**
 * Keeping W (RN-SUG-09): a load typed by hand or from another unit goes to the closest multiple;
 * half way, down.
 */
export function nearestOnGrid(kg: number, grid: LoadGrid): number {
  const { value, lower, upper } = neighbours(kg, grid);
  if (isSame(value, upper, grid.unit)) return toLoad(upper, grid);
  return toLoad(closer(value, lower, upper, false), grid);
}

/** `redondear` (RN-SUG-09): the closest multiple; half way, up. */
export function roundOnGrid(kg: number, grid: LoadGrid): number {
  const { value, lower, upper } = neighbours(kg, grid);
  if (isSame(value, upper, grid.unit)) return toLoad(upper, grid);
  return toLoad(closer(value, lower, upper, true), grid);
}

/**
 * subida(W, p) = round(máx(W + inc, W × (1 + p))) (RN-SUG-09). If that doesn't go over W, the
 * next multiple above W. With `máx(W + inc, …)` it always does; the guard keeps the rule literal.
 */
export function increaseLoad(workingLoadKg: number, percent: number, grid: LoadGrid): number {
  const increment = fromUnit(grid.increment, grid.unit);
  const result = roundOnGrid(
    Math.max(workingLoadKg + increment, workingLoadKg * (1 + percent)),
    grid,
  );
  if (result > workingLoadKg && !areLoadsEqual(result, workingLoadKg)) return result;
  const { value, upper } = neighbours(workingLoadKg, grid);
  return toLoad(isSame(value, upper, grid.unit) ? upper + grid.increment : upper, grid);
}

/**
 * bajada(W, p) = round(mín(W − inc, W × (1 − p))) (RN-SUG-09). If that isn't below W, the
 * multiple before W. Never under the minimum load (RN-PERF-08), which wins over going down.
 */
export function decreaseLoad(workingLoadKg: number, percent: number, grid: LoadGrid): number {
  const increment = fromUnit(grid.increment, grid.unit);
  const result = roundOnGrid(
    Math.min(workingLoadKg - increment, workingLoadKg * (1 - percent)),
    grid,
  );
  if (result < workingLoadKg && !areLoadsEqual(result, workingLoadKg)) return result;
  const { value, lower } = neighbours(workingLoadKg, grid);
  return toLoad(isSame(value, lower, grid.unit) ? lower - grid.increment : lower, grid);
}
