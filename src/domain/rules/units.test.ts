import { fromUnit, LB_TO_KG, toUnit } from '@/domain/rules/units';

describe('RN-PERF-05 · units', () => {
  it('1 lb is 0.45359237 kg', () => {
    expect(LB_TO_KG).toBe(0.45359237);
    expect(fromUnit(1, 'lb')).toBe(0.45359237);
    expect(toUnit(0.45359237, 'lb')).toBe(1);
  });

  it('kg stays as it is', () => {
    expect(toUnit(37.5, 'kg')).toBe(37.5);
    expect(fromUnit(37.5, 'kg')).toBe(37.5);
  });

  it('a lb load survives the round trip', () => {
    expect(toUnit(fromUnit(45, 'lb'), 'lb')).toBeCloseTo(45, 10);
  });
});
