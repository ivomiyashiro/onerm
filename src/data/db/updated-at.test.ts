import { nextUpdatedAt } from './updated-at';

describe('nextUpdatedAt (RN-GEN-03)', () => {
  it('uses now on the first write', () => {
    expect(nextUpdatedAt(1_000, null)).toBe(1_000);
  });

  it('uses now when the clock moved forward', () => {
    expect(nextUpdatedAt(2_000, 1_000)).toBe(2_000);
  });

  it('moves 1 ms past the previous value when the clock went back', () => {
    expect(nextUpdatedAt(500, 1_000)).toBe(1_001);
  });

  it('moves 1 ms past the previous value when both writes fall on the same ms', () => {
    expect(nextUpdatedAt(1_000, 1_000)).toBe(1_001);
  });
});
