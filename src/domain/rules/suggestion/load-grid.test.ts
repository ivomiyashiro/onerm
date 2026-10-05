import { floorToGrid, nearestOnGrid, type LoadGrid } from '@/domain/rules/suggestion/load-grid';
import { fromUnit, toUnit } from '@/domain/rules/units';

const barbellKg: LoadGrid = { unit: 'kg', increment: 2.5, minLoad: 20 };
const dumbbellKg: LoadGrid = { unit: 'kg', increment: 2, minLoad: 2 };
const barbellLb: LoadGrid = { unit: 'lb', increment: 5, minLoad: 45 };
const lb = (kg: number) => toUnit(kg, 'lb');

describe('RN-SUG-09 · load grid', () => {
  describe('floorToGrid (estimates: always down)', () => {
    it('goes to the multiple below', () => {
      expect(floorToGrid(36, barbellKg)).toBe(35);
      expect(floorToGrid(32, barbellKg)).toBe(30);
      expect(floorToGrid(37.916, barbellKg)).toBe(37.5);
    });

    it('keeps a load already on the grid', () => {
      expect(floorToGrid(35, barbellKg)).toBe(35);
    });

    it('a load less than 0.05 kg under a multiple is on it (RN-GEN-02)', () => {
      expect(floorToGrid(34.96, barbellKg)).toBe(35);
      expect(floorToGrid(34.9, barbellKg)).toBe(32.5);
    });

    it('never goes under the minimum load (RN-PERF-08)', () => {
      expect(floorToGrid(17.5, barbellKg)).toBe(20);
      expect(floorToGrid(1, dumbbellKg)).toBe(2);
    });

    it('works on the grid of the user unit', () => {
      expect(lb(floorToGrid(fromUnit(57, 'lb'), barbellLb))).toBeCloseTo(55, 9);
      // 0.1 lb is 0.045 kg: equal to the multiple (RN-GEN-02).
      expect(lb(floorToGrid(fromUnit(54.9, 'lb'), barbellLb))).toBeCloseTo(55, 9);
      expect(lb(floorToGrid(fromUnit(30, 'lb'), barbellLb))).toBeCloseTo(45, 9);
    });
  });

  describe('nearestOnGrid (keeping W: the closest, half down)', () => {
    it('goes to the closest multiple', () => {
      expect(nearestOnGrid(11.2, dumbbellKg)).toBe(12);
      expect(nearestOnGrid(10.6, dumbbellKg)).toBe(10);
    });

    it('half way goes down (RF-SUG-01.AC3: 11 kg by hand with 2 kg dumbbells)', () => {
      expect(nearestOnGrid(11, dumbbellKg)).toBe(10);
    });

    it('a load within the tolerance is that multiple', () => {
      expect(nearestOnGrid(60.04, barbellKg)).toBe(60);
    });

    it('never goes under the minimum load', () => {
      expect(nearestOnGrid(10, barbellKg)).toBe(20);
    });

    it('works on the grid of the user unit', () => {
      expect(lb(nearestOnGrid(fromUnit(52.5, 'lb'), barbellLb))).toBeCloseTo(50, 9);
      expect(lb(nearestOnGrid(fromUnit(53, 'lb'), barbellLb))).toBeCloseTo(55, 9);
    });
  });
});
