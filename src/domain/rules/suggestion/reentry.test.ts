import type { SuggestionContext } from '@/domain/rules/suggestion/engine-types';
import { inactivityGapDays, reentryFor } from '@/domain/rules/suggestion/reentry';
import { aPrescription } from '@/domain/testing/builders';
import type { LocalDate } from '@/domain/models/local-date';

const day = (n: number) => new Date(Date.UTC(2026, 0, 1 + n, 15));
const toLocal = (instant: Date) => instant.toISOString().slice(0, 10) as LocalDate;

function context(todayN: number, workoutDays: number[]): SuggestionContext {
  return {
    today: toLocal(day(todayN)),
    localDate: toLocal,
    workoutDates: workoutDays.map((n) => ({ startedAt: day(n), finishedAt: day(n) })),
    prescription: aPrescription(),
    loadType: 'external',
    grid: { unit: 'kg', increment: 2.5, minLoad: 20 },
    exerciseExposures: [],
  };
}

describe('RN-SUG-05 · inactivity gap', () => {
  it('from the last workout to today', () => {
    expect(inactivityGapDays(day(0), context(25, [0]))).toBe(25);
  });

  it('the biggest gap between consecutive finished workouts since the base, or until today', () => {
    // Base on day 0; the user trained on 2, then nothing until 32; today is 34.
    expect(inactivityGapDays(day(0), context(34, [0, 2, 32]))).toBe(30);
  });

  it('only from the base on: older gaps do not count', () => {
    expect(inactivityGapDays(day(50), context(53, [0, 50, 52]))).toBe(2);
  });

  it('caso O · a long rotation without a pause is not a gap', () => {
    // 2 workouts a week; the leg press was done 14 days ago.
    expect(inactivityGapDays(day(0), context(14, [0, 3, 7, 10, 14]))).toBe(4);
  });

  it('counts local calendar days (RN-GEN-01)', () => {
    const late = new Date(Date.UTC(2026, 0, 1, 23, 30));
    const early = new Date(Date.UTC(2026, 0, 2, 0, 30));
    // In UTC-3 both are January 1st.
    const minus3 = (instant: Date) => toLocal(new Date(instant.getTime() - 3 * 3600 * 1000));

    expect(
      inactivityGapDays(late, { ...context(0, []), today: minus3(early), localDate: minus3 }),
    ).toBe(0);
  });
});

describe('RN-SUG-05 · reentry', () => {
  it('caso D · more than 21 days: −10 %; more than 42: −20 %; 21 or less: none', () => {
    expect(reentryFor(day(0), context(25, [0]))).toEqual({ gapDays: 25, decreasePercent: 0.1 });
    expect(reentryFor(day(0), context(45, [0]))).toEqual({ gapDays: 45, decreasePercent: 0.2 });
    expect(reentryFor(day(0), context(15, [0]))).toBeNull();
    expect(reentryFor(day(0), context(21, [0]))).toBeNull();
    expect(reentryFor(day(0), context(22, [0]))).toEqual({ gapDays: 22, decreasePercent: 0.1 });
    expect(reentryFor(day(0), context(42, [0]))).toEqual({ gapDays: 42, decreasePercent: 0.1 });
  });
});
