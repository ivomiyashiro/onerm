import { isNudgeDue, NUDGE_INTERVAL_DAYS } from '@/domain/rules/auth/account-nudge';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-15T12:00:00Z');

describe('account nudge (RF-AUTH-01.AC5, AC6)', () => {
  it('AC5: it is offered when it was never answered', () => {
    expect(isNudgeDue(null, NOW)).toBe(true);
  });

  it('AC5: after answering it is not offered again for 7 days', () => {
    expect(NUDGE_INTERVAL_DAYS).toBe(7);
    expect(isNudgeDue(new Date(NOW.getTime() - 6 * DAY), NOW)).toBe(false);
    expect(isNudgeDue(new Date(NOW.getTime() - 1000), NOW)).toBe(false);
  });

  it('AC6: after 7 days or more it is offered again', () => {
    expect(isNudgeDue(new Date(NOW.getTime() - 7 * DAY), NOW)).toBe(true);
    expect(isNudgeDue(new Date(NOW.getTime() - 30 * DAY), NOW)).toBe(true);
  });
});
