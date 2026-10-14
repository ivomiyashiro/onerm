import type { RestMessage, RestTimer } from '@/domain/models/rest-timer';
import type { DevicePermissions } from '@/domain/repositories/device-permissions';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { RestNotifier } from '@/domain/repositories/rest-notifier';
import type { RestTimerRepository } from '@/domain/repositories/rest-timer-repository';

/** RF-ENT-06.AC2: what «+15 s» adds. */
export const REST_EXTRA_SECONDS = 15;

/**
 * Shared by the actions that move the end of the rest: they save the absolute end and schedule
 * the notice for it (RN-ENT-07). Without notifications or exact alarms nothing is scheduled: a
 * late notice is worse than none (spike #14).
 */
abstract class RestScheduling {
  constructor(
    protected readonly timers: RestTimerRepository,
    private readonly notifier: RestNotifier,
    private readonly permissions: DevicePermissions,
    protected readonly now: () => Date,
  ) {}

  protected async endAt(endsAt: Date, message: RestMessage): Promise<void> {
    await this.timers.saveEndsAt(endsAt);
    await this.schedule(endsAt, message);
  }

  protected async schedule(endsAt: Date, message: RestMessage): Promise<void> {
    const allowed =
      (await this.permissions.notifications()) === 'granted' &&
      (await this.permissions.canScheduleExactAlarms());
    if (allowed) await this.notifier.schedule(endsAt, message);
    else await this.notifier.cancel();
  }
}

/** RF-ENT-06.AC1, AC3: a rest of `seconds` from now, after a set or with «Reiniciar». */
export class StartRest extends RestScheduling {
  execute(seconds: number, message: RestMessage): Promise<void> {
    return this.endAt(new Date(this.now().getTime() + seconds * 1000), message);
  }
}

/** RF-ENT-06.AC2: «+15 s»; after the end it counts from now. Without a rest, nothing. */
export class AddRestTime extends RestScheduling {
  async execute(message: RestMessage): Promise<void> {
    const { endsAt } = await this.timers.get();
    if (endsAt === null) return;
    const from = Math.max(endsAt.getTime(), this.now().getTime());
    await this.endAt(new Date(from + REST_EXTRA_SECONDS * 1000), message);
  }
}

/** A permission given during the rest: the notice of that rest is scheduled now. */
export class RescheduleRest extends RestScheduling {
  async execute(message: RestMessage): Promise<void> {
    const { endsAt } = await this.timers.get();
    if (endsAt !== null && endsAt > this.now()) await this.schedule(endsAt, message);
  }
}

/** RF-ENT-06.AC4: «Saltear» stops the rest and cancels its notice. */
export class SkipRest {
  constructor(
    private readonly timers: RestTimerRepository,
    private readonly notifier: RestNotifier,
  ) {}

  async execute(): Promise<void> {
    await this.timers.saveEndsAt(null);
    await this.notifier.cancel();
  }
}

export class ObserveRestTimer {
  constructor(private readonly timers: Pick<RestTimerRepository, 'observe'>) {}

  execute(observer: Observer<RestTimer>): Unsubscribe {
    return this.timers.observe(observer);
  }
}

/**
 * RF-ENT-06.AC9: D05 on the first set, once, and D17 after it when the system doesn't allow exact
 * alarms. The workout goes on whatever the answer.
 */
export class AskRestPermission {
  constructor(
    private readonly timers: RestTimerRepository,
    private readonly permissions: DevicePermissions,
  ) {}

  /** Never shown, and the system never asked. */
  async shouldAsk(): Promise<boolean> {
    const { notificationPermissionAsked } = await this.timers.get();
    return (
      !notificationPermissionAsked && (await this.permissions.notifications()) === 'undetermined'
    );
  }

  /** «Ahora no». */
  dismiss(): Promise<void> {
    return this.timers.markNotificationPermissionAsked();
  }

  /** «Permitir»: the system prompt; 'exactAlarms' when D17 comes next. */
  async allow(): Promise<'exactAlarms' | 'done'> {
    // Marked once the system answered: a prompt cut halfway asks again next time.
    const granted = await this.permissions.requestNotifications();
    await this.timers.markNotificationPermissionAsked();
    return granted && !(await this.permissions.canScheduleExactAlarms()) ? 'exactAlarms' : 'done';
  }

  /** D17 «Abrir ajustes», or «Permitir» in the notice of S09. */
  openExactAlarmSettings(): Promise<void> {
    return this.permissions.openExactAlarmSettings();
  }

  /** «Activar» in the notice of S09. */
  openNotificationSettings(): Promise<void> {
    return this.permissions.openNotificationSettings();
  }
}

/** RF-ENT-06.AC7, AC10: the notice of S09 (and the row of S21), by the permission that is missing. */
export class ReadRestPermissions {
  constructor(
    private readonly timers: RestTimerRepository,
    private readonly permissions: DevicePermissions,
  ) {}

  /**
   * `neverAsked: 'missing'` (S21): a permission the system never asked for counts as missing.
   * S09 waits for D05 instead, so by default it says nothing yet.
   */
  async execute({
    neverAsked = 'waitForD05',
  }: { neverAsked?: 'waitForD05' | 'missing' } = {}): Promise<
    'notifications' | 'exactAlarms' | null
  > {
    const notifications = await this.permissions.notifications();
    if (notifications === 'denied') return 'notifications';
    // Never asked: D05 comes first. After D05 they are off, even if the system could still ask.
    if (notifications === 'undetermined') {
      if (neverAsked === 'missing') return 'notifications';
      return (await this.timers.get()).notificationPermissionAsked ? 'notifications' : null;
    }
    return (await this.permissions.canScheduleExactAlarms()) ? null : 'exactAlarms';
  }
}
