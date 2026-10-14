import {
  FakeDevicePermissions,
  FakeRestNotifier,
  InMemoryRestTimerRepository,
} from '@/domain/testing/in-memory-repositories';
import {
  AddRestTime,
  AskRestPermission,
  ReadRestPermissions,
  RescheduleRest,
  SkipRest,
  StartRest,
} from '@/domain/usecases/rest-timer';

const NOW = new Date('2026-10-13T18:00:00Z');
const at = (seconds: number) => new Date(NOW.getTime() + seconds * 1000);
const MESSAGE = { title: '¡Descanso terminado!', body: 'Siguiente: Sentadilla · 100 kg × 8' };

function setup(permissions = new FakeDevicePermissions()) {
  const timers = new InMemoryRestTimerRepository();
  const notifier = new FakeRestNotifier();
  const deps = [timers, notifier, permissions, () => NOW] as const;
  return {
    timers,
    notifier,
    permissions,
    start: new StartRest(...deps),
    add: new AddRestTime(...deps),
    skip: new SkipRest(timers, notifier),
    reschedule: new RescheduleRest(...deps),
  };
}

describe('rest timer (RN-ENT-07)', () => {
  it('RF-ENT-06.AC1: starts with the prescribed rest as an absolute end, and schedules the notice', async () => {
    const { start, timers, notifier } = setup();

    await start.execute(120, MESSAGE);

    expect(timers.timer.endsAt).toEqual(at(120));
    expect(notifier.scheduled).toEqual({ at: at(120), message: MESSAGE });
  });

  it('RF-ENT-06.AC2: +15 s moves the end and the notice', async () => {
    const { start, add, timers, notifier } = setup();
    await start.execute(120, MESSAGE);

    await add.execute(MESSAGE);

    expect(timers.timer.endsAt).toEqual(at(135));
    expect(notifier.scheduled?.at).toEqual(at(135));
  });

  it('+15 s after the end counts from now, and without a rest does nothing', async () => {
    const { add, timers } = setup();
    await add.execute(MESSAGE);
    expect(timers.timer.endsAt).toBeNull();

    await timers.saveEndsAt(at(-30));
    await add.execute(MESSAGE);
    expect(timers.timer.endsAt).toEqual(at(15));
  });

  it('RF-ENT-06.AC3: «Reiniciar» starts the full rest again', async () => {
    const { start, add, timers } = setup();
    await start.execute(120, MESSAGE);
    await add.execute(MESSAGE);

    await start.execute(120, MESSAGE);

    expect(timers.timer.endsAt).toEqual(at(120));
  });

  it('RF-ENT-06.AC4: «Saltear» stops it and leaves no notice', async () => {
    const { start, skip, timers, notifier } = setup();
    await start.execute(120, MESSAGE);

    await skip.execute();

    expect(timers.timer.endsAt).toBeNull();
    expect(notifier.scheduled).toBeNull();
  });

  it('RF-ENT-06.AC10: without exact alarms the notice is not scheduled', async () => {
    const { start, timers, notifier } = setup(new FakeDevicePermissions('granted', false));

    await start.execute(120, MESSAGE);

    expect(timers.timer.endsAt).toEqual(at(120));
    expect(notifier.scheduled).toBeNull();
  });

  it('RF-ENT-06.AC7: without notifications the notice is not scheduled either', async () => {
    const { start, notifier } = setup(new FakeDevicePermissions('denied'));

    await start.execute(120, MESSAGE);

    expect(notifier.scheduled).toBeNull();
  });

  it('a permission given during the rest schedules the notice of that rest', async () => {
    const permissions = new FakeDevicePermissions('granted', false);
    const { start, reschedule, notifier } = setup(permissions);
    await start.execute(120, MESSAGE);

    permissions.exactAlarms = true;
    await reschedule.execute(MESSAGE);

    expect(notifier.scheduled?.at).toEqual(at(120));
  });

  it('a rest that already ended is not scheduled again', async () => {
    const { timers, reschedule, notifier } = setup();
    await timers.saveEndsAt(at(-5));

    await reschedule.execute(MESSAGE);

    expect(notifier.scheduled).toBeNull();
  });
});

describe('rest permissions (RF-ENT-06.AC9, AC10)', () => {
  it('AC9: D05 is shown once, only while the system never asked', async () => {
    const timers = new InMemoryRestTimerRepository();
    const ask = new AskRestPermission(timers, new FakeDevicePermissions('undetermined'));

    expect(await ask.shouldAsk()).toBe(true);
    await ask.dismiss();
    expect(await ask.shouldAsk()).toBe(false);
  });

  it('AC9: allowing without exact alarms goes on to D17', async () => {
    const timers = new InMemoryRestTimerRepository();
    const permissions = new FakeDevicePermissions('undetermined', false);

    expect(await new AskRestPermission(timers, permissions).allow()).toBe('exactAlarms');
    expect(timers.timer.notificationPermissionAsked).toBe(true);
  });

  it('AC9: allowing with exact alarms, or refusing, goes on with the workout', async () => {
    const allow = (permissions: FakeDevicePermissions) =>
      new AskRestPermission(new InMemoryRestTimerRepository(), permissions).allow();

    expect(await allow(new FakeDevicePermissions('undetermined', true))).toBe('done');
    expect(await allow(new FakeDevicePermissions('undetermined', false, false))).toBe('done');
  });

  it('AC7, AC10: the notices of S09 say which permission is missing', async () => {
    const read = (permissions: FakeDevicePermissions, asked = false) =>
      new ReadRestPermissions(
        new InMemoryRestTimerRepository({ endsAt: null, notificationPermissionAsked: asked }),
        permissions,
      ).execute();

    expect(await read(new FakeDevicePermissions('denied'))).toBe('notifications');
    expect(await read(new FakeDevicePermissions('granted', false))).toBe('exactAlarms');
    expect(await read(new FakeDevicePermissions('granted', true))).toBeNull();
    // Never asked: D05 comes first, no notice yet.
    expect(await read(new FakeDevicePermissions('undetermined'))).toBeNull();
    // D05 answered «Ahora no»: the system could still ask, but the notice says it's off.
    expect(await read(new FakeDevicePermissions('undetermined'), true)).toBe('notifications');
  });

  it('S21 (#146): a permission never asked is not given either', async () => {
    const read = new ReadRestPermissions(
      new InMemoryRestTimerRepository(),
      new FakeDevicePermissions('undetermined'),
    );

    expect(await read.execute({ neverAsked: 'missing' })).toBe('notifications');
  });
});
