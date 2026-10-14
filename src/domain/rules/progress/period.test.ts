import type { LocalDate } from '@/domain/models/local-date';
import { periodStart } from '@/domain/rules/progress/period';

const day = (date: string) => date as LocalDate;

describe('periodStart (RF-PROG-04.AC3)', () => {
  it('«4 semanas» is the last 28 days', () => {
    expect(periodStart('fourWeeks', day('2026-10-14'))).toBe('2026-09-16');
  });

  it('«3 meses» goes back three calendar months', () => {
    expect(periodStart('threeMonths', day('2026-10-14'))).toBe('2026-07-14');
  });

  it('«3 meses» from the 31st lands on the last day of a shorter month', () => {
    expect(periodStart('threeMonths', day('2026-05-31'))).toBe('2026-02-28');
  });

  it('«Todo» has no start', () => {
    expect(periodStart('all', day('2026-10-14'))).toBeNull();
  });
});
