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

/** Back to kg, never under the minimum load (RN-PERF-08). */
function toLoad(value: number, grid: LoadGrid): number {
  return fromUnit(Math.max(value, grid.minLoad), grid.unit);
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
  return toLoad(value - lower <= upper - value ? lower : upper, grid);
}
