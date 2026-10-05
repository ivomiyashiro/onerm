import { daysBetween } from '@/domain/rules/calendar';

describe('RN-GEN-01 · calendar days', () => {
  it('counts calendar days between two local dates', () => {
    expect(daysBetween('2026-10-01', '2026-10-05')).toBe(4);
    expect(daysBetween('2026-10-05', '2026-10-05')).toBe(0);
    expect(daysBetween('2026-10-05', '2026-10-01')).toBe(-4);
  });

  it('crosses months, years and leap days', () => {
    expect(daysBetween('2026-09-30', '2026-10-01')).toBe(1);
    expect(daysBetween('2027-12-31', '2028-01-01')).toBe(1);
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
  });

  it('a day is a calendar day, not 24 h: a daylight saving change does not matter', () => {
    // Dates carry no time: 23 h and 25 h days count as one.
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
  });
});
