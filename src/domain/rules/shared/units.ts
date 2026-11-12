import type { LoadUnit } from '@/domain/models/vocabulary';

/** RN-PERF-05: loads are stored in kg, unrounded. */
export const LB_TO_KG = 0.45359237;

/** A load in kg, expressed in `unit`. */
export function toUnit(kg: number, unit: LoadUnit): number {
  return unit === 'kg' ? kg : kg / LB_TO_KG;
}

/** A load in `unit`, back in kg. */
export function fromUnit(value: number, unit: LoadUnit): number {
  return unit === 'kg' ? value : value * LB_TO_KG;
}
