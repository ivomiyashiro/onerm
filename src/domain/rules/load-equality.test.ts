import { areLoadsEqual } from '@/domain/rules/load-equality';

describe('RN-GEN-02 · load equality', () => {
  it('are equal when they differ by less than 0.05 kg', () => {
    expect(areLoadsEqual(60, 60)).toBe(true);
    expect(areLoadsEqual(60, 60.049)).toBe(true);
    expect(areLoadsEqual(60.049, 60)).toBe(true);
  });

  it('are not equal when they differ by 0.05 kg or more', () => {
    expect(areLoadsEqual(60, 60.05)).toBe(false);
    expect(areLoadsEqual(60, 62.5)).toBe(false);
  });

  it('absorbs the rounding of the kg ↔ lb conversion (RN-PERF-05)', () => {
    // lb is entered with 1 decimal: 44.149 lb is shown as 44.1 lb and converted back to kg.
    const LB_TO_KG = 0.45359237;
    const stored = 44.149 * LB_TO_KG; // 20.0256 kg
    const reentered = 44.1 * LB_TO_KG; // 20.0034 kg
    expect(stored - reentered).toBeGreaterThan(0.02); // the rounding error is not negligible
    expect(areLoadsEqual(stored, reentered)).toBe(true);
  });
});
