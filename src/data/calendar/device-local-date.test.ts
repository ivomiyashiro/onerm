import { deviceLocalDate } from '@/data/calendar/device-local-date';

describe('deviceLocalDate', () => {
  it('RN-GEN-01: the date in the device zone, not in UTC', () => {
    // Built from local components: 23:30 local is still the 13th whatever the zone.
    expect(deviceLocalDate(new Date(2026, 9, 13, 23, 30))).toBe('2026-10-13');
    expect(deviceLocalDate(new Date(2026, 0, 5, 0, 10))).toBe('2026-01-05');
  });
});
