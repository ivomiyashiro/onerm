import { estimatedOneRepMax, loadForTarget } from '@/domain/rules/suggestion/e1rm';

describe('RN-SUG-07 · e1RM (Brzycki)', () => {
  it('load × 36 / (37 − RTF), with RTF = reps + RIR', () => {
    expect(estimatedOneRepMax(35, 11, 2)).toEqual({ value: 52.5, precision: 'approximate' });
    expect(estimatedOneRepMax(100, 6, 2)?.value).toBeCloseTo(124.14, 2);
  });

  it('without RIR assumes RIR 0 (conservative)', () => {
    expect(estimatedOneRepMax(100, 6, null)?.value).toBeCloseTo((100 * 36) / 31, 9);
  });

  it('RTF 1 is the load', () => {
    expect(estimatedOneRepMax(140, 1, 0)).toEqual({ value: 140, precision: 'standard' });
  });

  it('standard up to RTF 10, approximate from 11 to 15, none over 15', () => {
    expect(estimatedOneRepMax(60, 8, 2)?.precision).toBe('standard');
    expect(estimatedOneRepMax(60, 9, 2)?.precision).toBe('approximate');
    expect(estimatedOneRepMax(60, 12, 3)?.precision).toBe('approximate');
    expect(estimatedOneRepMax(60, 12, 4)).toBeNull();
  });

  it('caso K · 50 × 10 with RIR 2 is RTF 12, approximate: e1RM 72', () => {
    expect(estimatedOneRepMax(50, 10, 2)).toEqual({ value: 72, precision: 'approximate' });
  });

  it('no e1RM without reps', () => {
    expect(estimatedOneRepMax(60, 0, 3)).toBeNull();
  });
});

describe('RN-SUG-08 · load for a target from an e1RM', () => {
  it('e1RM × (37 − target RTF) / 36, with target RTF = floor + target RIR', () => {
    // caso E: 52.5 × 26 / 36 = 37.9
    expect(loadForTarget(52.5, { min: 8, max: 12 }, 3)).toBeCloseTo(37.917, 3);
    // caso K: 72 × 27 / 36 = 54
    expect(loadForTarget(72, { min: 8, max: 12 }, 2)).toBe(54);
  });

  it('does not apply when the target RTF is over 15', () => {
    expect(loadForTarget(72, { min: 12, max: 15 }, 4)).toBeNull();
    expect(loadForTarget(72, { min: 12, max: 15 }, 3)).not.toBeNull();
  });
});
