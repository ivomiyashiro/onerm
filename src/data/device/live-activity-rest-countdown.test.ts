import {
  LiveActivityRestCountdown,
  type RestActivities,
} from '@/data/device/live-activity-rest-countdown';

const NOW = new Date('2026-10-13T18:00:00Z');
const ENDS_AT = new Date('2026-10-13T18:02:00Z');
const LATER = new Date(ENDS_AT.getTime() + 15_000);
const NEXT = 'Siguiente: Sentadilla · 100 kg × 8';
const TEXT = { title: 'Descanso', finished: '¡Descanso terminado!' };

interface Activity {
  props: object;
  staleDate?: Date;
  ended?: unknown;
}

/** Keeps the activities ActivityKit would hold; an ended one is no longer an instance. */
function fakeActivities(existing: Activity[] = []) {
  const activities = [...existing];
  const handle = (activity: Activity) => ({
    update: async (props: object, staleDate?: Date) => {
      Object.assign(activity, { props, staleDate });
    },
    end: async (policy: unknown) => {
      activity.ended = policy;
    },
  });
  const factory: RestActivities = {
    start(props, _url, staleDate) {
      const activity: Activity = { props, staleDate };
      activities.push(activity);
      return handle(activity);
    },
    getInstances: () => activities.filter((activity) => activity.ended === undefined).map(handle),
  };
  return { factory, activities };
}

const countdownOver = (factory: RestActivities) =>
  new LiveActivityRestCountdown(factory, TEXT, () => NOW);

describe('LiveActivityRestCountdown (#305)', () => {
  it('starts the activity counting down to the absolute end, stale from then on', async () => {
    const { factory, activities } = fakeActivities();

    await countdownOver(factory).show(ENDS_AT, NEXT);

    expect(activities).toEqual([
      {
        props: { ...TEXT, next: NEXT, startsAt: NOW.getTime(), endsAt: ENDS_AT.getTime() },
        staleDate: ENDS_AT,
      },
    ]);
  });

  it('moving the end updates the same activity', async () => {
    const { factory, activities } = fakeActivities();
    const countdown = countdownOver(factory);
    await countdown.show(ENDS_AT, NEXT);

    await countdown.show(LATER, NEXT);

    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({ props: { endsAt: LATER.getTime() }, staleDate: LATER });
  });

  it('takes over the activity a previous run of the app left', async () => {
    const { factory, activities } = fakeActivities([{ props: {} }]);

    await countdownOver(factory).show(ENDS_AT, NEXT);

    expect(activities).toHaveLength(1);
    expect(activities[0]!.staleDate).toEqual(ENDS_AT);
  });

  it('two shows at once leave one activity: the start and the text of the next set race', async () => {
    const { factory, activities } = fakeActivities();
    const countdown = countdownOver(factory);

    await Promise.all([countdown.show(ENDS_AT, ''), countdown.show(ENDS_AT, NEXT)]);

    expect(activities).toHaveLength(1);
    expect(activities[0]!.props).toMatchObject({ next: NEXT });
  });

  it('hide removes it at once, and a failure is swallowed', async () => {
    const { factory, activities } = fakeActivities();
    const countdown = countdownOver(factory);
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
