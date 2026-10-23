import {
  LiveActivityRestCountdown,
  type RestActivities,
} from '@/data/device/live-activity-rest-countdown';

const NOW = new Date('2026-10-13T18:00:00Z');
const ENDS_AT = new Date('2026-10-13T18:02:00Z');
const NEXT = 'Siguiente: Sentadilla · 100 kg × 8';

/**
 * Keeps the activities ActivityKit would hold. One ended with `after(date)` is still on screen,
 * so it is still an instance until something removes it at once.
 */
function fakeActivities() {
  const activities: { props: object; ended?: unknown }[] = [];
  const handle = (activity: { ended?: unknown }) => ({
    end: async (policy: unknown) => {
      activity.ended = policy;
    },
  });
  const factory: RestActivities = {
    start(props) {
      const activity: { props: object; ended?: unknown } = { props };
      activities.push(activity);
      return handle(activity);
    },
    getInstances: () => activities.filter((activity) => activity.ended !== 'immediate').map(handle),
  };
  return { factory, activities };
}

describe('LiveActivityRestCountdown (#305)', () => {
  it('starts the activity counting down to the absolute end, and lets the system remove it then', async () => {
    const { factory, activities } = fakeActivities();

    await new LiveActivityRestCountdown(factory, 'Descanso', () => NOW).show(ENDS_AT, NEXT);

    expect(activities).toEqual([
      {
        props: {
          title: 'Descanso',
          next: NEXT,
          startsAt: NOW.getTime(),
          endsAt: ENDS_AT.getTime(),
        },
        ended: { after: ENDS_AT },
      },
    ]);
  });

  it('moving the end replaces the activity: one already ended takes no updates', async () => {
    const { factory, activities } = fakeActivities();
    const countdown = new LiveActivityRestCountdown(factory, 'Descanso', () => NOW);
    await countdown.show(ENDS_AT, NEXT);

    await countdown.show(new Date(ENDS_AT.getTime() + 15_000), NEXT);

    expect(activities.map((activity) => activity.ended)).toEqual([
      'immediate',
      { after: new Date(ENDS_AT.getTime() + 15_000) },
    ]);
  });

  it('hide removes it at once, and a failure is swallowed', async () => {
    const { factory, activities } = fakeActivities();
    const countdown = new LiveActivityRestCountdown(factory, 'Descanso', () => NOW);
    await countdown.show(ENDS_AT, NEXT);

    await countdown.hide();
    expect(activities[0]!.ended).toBe('immediate');

    factory.getInstances = () => {
      throw new Error('Live Activities are off');
    };
    await expect(countdown.show(ENDS_AT, NEXT)).resolves.toBeUndefined();
    await expect(countdown.hide()).resolves.toBeUndefined();
  });
});
