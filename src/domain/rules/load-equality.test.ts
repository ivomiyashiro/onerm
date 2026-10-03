import { areLoadsEqual } from '@/domain/rules/load-equality';

describe('RN-GEN-02 · igualdad de cargas', () => {
  it('son iguales si difieren en menos de 0,05 kg', () => {
    expect(areLoadsEqual(60, 60)).toBe(true);
    expect(areLoadsEqual(60, 60.049)).toBe(true);
    expect(areLoadsEqual(60.049, 60)).toBe(true);
  });

  it('no son iguales si difieren en 0,05 kg o más', () => {
    expect(areLoadsEqual(60, 60.05)).toBe(false);
    expect(areLoadsEqual(60, 62.5)).toBe(false);
  });

  it('absorbe el redondeo de la conversión kg ↔ lb (RN-PERF-05)', () => {
    const fortyFivePoundsInKg = 45 * 0.45359237; // 20,41165665 kg
    expect(areLoadsEqual(fortyFivePoundsInKg, 20.41)).toBe(true);
  });
});
