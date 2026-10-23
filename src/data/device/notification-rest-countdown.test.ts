import { NotificationRestCountdown } from '@/data/device/notification-rest-countdown';
import { RestCountdownNotification } from '../../../modules/rest-countdown';

jest.mock('../../../modules/rest-countdown', () => ({
  RestCountdownNotification: { show: jest.fn(), hide: jest.fn() },
}));

const ENDS_AT = new Date('2026-10-13T18:02:00Z');
const countdown = new NotificationRestCountdown('Descanso', 'Descanso en curso');

describe('NotificationRestCountdown (#305)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the ongoing notification counting down to the absolute end', async () => {
    await countdown.show(ENDS_AT, 'Siguiente: Sentadilla · 100 kg × 8');

    expect(RestCountdownNotification.show).toHaveBeenCalledWith(
      ENDS_AT.getTime(),
      'Descanso',
      'Siguiente: Sentadilla · 100 kg × 8',
      'Descanso en curso',
    );
  });

  it('swallows a failure: the rest on screen and the set never depend on it', async () => {
    jest.mocked(RestCountdownNotification.show).mockImplementation(() => {
      throw new Error('no notification service');
    });
    jest.mocked(RestCountdownNotification.hide).mockImplementation(() => {
      throw new Error('no notification service');
    });

    await expect(countdown.show(ENDS_AT, 'Siguiente')).resolves.toBeUndefined();
    await expect(countdown.hide()).resolves.toBeUndefined();
  });
});
