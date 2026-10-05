import {
  decreaseLoad,
  floorToGrid,
  increaseLoad,
  nearestOnGrid,
  roundOnGrid,
  type LoadGrid,
} from '@/domain/rules/suggestion/load-grid';
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

describe('RN-SUG-09 · round, increase and decrease', () => {
  it('roundOnGrid goes to the closest multiple; half way, up', () => {
    expect(roundOnGrid(63, barbellKg)).toBe(62.5);
    expect(roundOnGrid(66, barbellKg)).toBe(65);
    expect(roundOnGrid(56.25, barbellKg)).toBe(57.5);
  });

  it('increaseLoad · round(máx(W + inc, W × (1 + p)))', () => {
    // caso A: máx(62.5; 63) = 63 → 62.5.
    expect(increaseLoad(60, 0.05, barbellKg)).toBe(62.5);
    // caso C: máx(62.5; 66) = 66 → 65.
    expect(increaseLoad(60, 0.1, barbellKg)).toBe(65);
    // caso G: máx(14; 12.6) → 14.
    expect(increaseLoad(12, 0.05, dumbbellKg)).toBe(14);
  });

  it('increaseLoad · always ends above W, also with W off the grid', () => {
    // W = 60.9 (by hand): máx(63.4; 63.945) = 63.945 → 65.
    expect(increaseLoad(60.9, 0.05, barbellKg)).toBe(65);
    // round(máx(2.04 + 2; 2.142)) = 4.
    expect(increaseLoad(2.04, 0.05, dumbbellKg)).toBe(4);
  });

  it('decreaseLoad · round(mín(W − inc, W × (1 − p)))', () => {
    // caso A: mín(60; 56.25) = 56.25 → 57.5.
    expect(decreaseLoad(62.5, 0.1, barbellKg)).toBe(57.5);
    // caso D: mín(60; 50) = 50.
    expect(decreaseLoad(62.5, 0.2, barbellKg)).toBe(50);
  });

  it('decreaseLoad · always ends below W, also with W off the grid', () => {
    // W = 21 (by hand): mín(18.5; 18.9) = 18.5 → 17.5 → bar 20, which is below 21.
    expect(decreaseLoad(21, 0.1, { ...barbellKg, minLoad: 2.5 })).toBe(17.5);
    // W = 63.6 with a 5 kg machine: mín(58.6; 57.24) = 57.24 → 55.
    expect(decreaseLoad(63.6, 0.1, { unit: 'kg', increment: 5, minLoad: 5 })).toBe(55);
  });

  it('caso N · decreaseLoad never goes under the minimum load (RN-PERF-08)', () => {
    // bajada(22.5; 20 %) = round(mín(20; 18)) = 17.5 → under 20 kg → 20.
    expect(decreaseLoad(22.5, 0.2, barbellKg)).toBe(20);
  });

  it('works on the grid of the user unit', () => {
    // 100 lb + 5 % = 105 → 105 lb.
    expect(lb(increaseLoad(fromUnit(100, 'lb'), 0.05, barbellLb))).toBeCloseTo(105, 9);
    expect(lb(decreaseLoad(fromUnit(100, 'lb'), 0.1, barbellLb))).toBeCloseTo(90, 9);
  });
});

describe('RN-SUG-09 · exact halves on the lb grid (lb comes from kg with float noise)', () => {
  it('round goes up: 350 lb + 5 % = 367.5 → 370', () => {
    expect(lb(increaseLoad(fromUnit(350, 'lb'), 0.05, barbellLb))).toBeCloseTo(370, 9);
    expect(lb(roundOnGrid(fromUnit(367.5, 'lb'), barbellLb))).toBeCloseTo(370, 9);
  });

  it('keeping W goes down: 92.5 lb → 90', () => {
    expect(lb(nearestOnGrid(fromUnit(92.5, 'lb'), barbellLb))).toBeCloseTo(90, 9);
  });

  it('every half of a 5 lb grid, from 50 to 400 lb', () => {
    for (let half = 52.5; half <= 400; half += 5) {
      expect(lb(roundOnGrid(fromUnit(half, 'lb'), barbellLb))).toBeCloseTo(half + 2.5, 9);
      expect(lb(nearestOnGrid(fromUnit(half, 'lb'), barbellLb))).toBeCloseTo(half - 2.5, 9);
    }
  });
});

describe('RN-PERF-08 · a minimum load off the grid', () => {
  // A 7 kg bar with 2.5 kg increments: the lowest suggestion is the first multiple ≥ 7.
  const sevenKgBar: LoadGrid = { unit: 'kg', increment: 2.5, minLoad: 7 };

  it('the lowest suggestion is the first multiple at or above it: 7.5', () => {
    expect(floorToGrid(3, sevenKgBar)).toBe(7.5);
    expect(nearestOnGrid(5, sevenKgBar)).toBe(7.5);
    expect(decreaseLoad(10, 0.2, sevenKgBar)).toBe(7.5);
  });

  it('a minimum load on the grid stays as it is', () => {
    expect(floorToGrid(10, barbellKg)).toBe(20);
  });

  it('within the tolerance of a multiple counts as that multiple (RN-GEN-02)', () => {
    expect(floorToGrid(3, { unit: 'kg', increment: 2.5, minLoad: 7.48 })).toBe(7.5);
    expect(floorToGrid(3, { unit: 'kg', increment: 2.5, minLoad: 5.04 })).toBe(5);
  });
});
