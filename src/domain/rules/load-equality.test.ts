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
    // En lb se ingresa con 1 decimal: 44,149 lb se muestra como 44,1 lb y vuelve a kg.
    const LB_TO_KG = 0.45359237;
    const stored = 44.149 * LB_TO_KG; // 20,0256 kg
    const reentered = 44.1 * LB_TO_KG; // 20,0034 kg
    expect(stored - reentered).toBeGreaterThan(0.02); // el error de redondeo no es despreciable
    expect(areLoadsEqual(stored, reentered)).toBe(true);
  });
});
