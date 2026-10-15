import type { DataOwner } from '@/domain/models/data-owner';
import type { OnboardingStep } from '@/domain/models/onboarding';
import type { Profile } from '@/domain/models/profile';
import type { RestMessage, RestTimer } from '@/domain/models/rest-timer';
import type { RotationDay, Routine, RoutineDay } from '@/domain/models/routine';
import type { RoutineTemplate } from '@/domain/models/routine-template';
import type { Id } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type {
  AuthGateway,
  AuthOutcome,
  GoogleOutcome,
  NewPasswordOutcome,
  PasswordResetOutcome,
  RecoveryLinkOutcome,
} from '@/domain/repositories/auth-gateway';
import type {
  DevicePermissions,
  NotificationPermission,
} from '@/domain/repositories/device-permissions';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { OnboardingRepository } from '@/domain/repositories/onboarding-repository';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type { RestNotifier } from '@/domain/repositories/rest-notifier';
import type { RestTimerRepository } from '@/domain/repositories/rest-timer-repository';
import type { RoutineRepository } from '@/domain/repositories/routine-repository';
import type { RoutineTemplateRepository } from '@/domain/repositories/routine-template-repository';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';

/**
 * In-memory repositories for use case tests: they keep what is saved and re-emit to every
 * observer after a write, like the SQLite ones do after a table change. Used by tests only.
 */
class Observable<T> {
  private readonly observers = new Set<Observer<T>>();

  constructor(private readonly read: () => T) {}

  observe(observer: Observer<T>): Unsubscribe {
    this.observers.add(observer);
    observer.next(this.read());
    return () => this.observers.delete(observer);
  }

  changed() {
    const value = this.read();
    this.observers.forEach((observer) => observer.next(value));
  }

  fail(error: unknown) {
    this.observers.forEach((observer) => observer.error(error));
    this.observers.clear();
  }
}

export class InMemoryProfileRepository implements ProfileRepository {
  private readonly profile$ = new Observable(() => this.profile);

  constructor(public profile: Profile | null = null) {}

  observe(observer: Observer<Profile | null>): Unsubscribe {
    return this.profile$.observe(observer);
  }

  async save(profile: Profile): Promise<void> {
    this.profile = profile;
    this.profile$.changed();
  }

  fail(error: unknown = new Error('disk')) {
    this.profile$.fail(error);
  }
}

export class InMemoryOnboardingRepository implements OnboardingRepository {
  private readonly step$ = new Observable(() => this.step);

  constructor(public step: OnboardingStep | null = null) {}

  observeStep(observer: Observer<OnboardingStep | null>): Unsubscribe {
    return this.step$.observe(observer);
  }

  async saveStep(step: OnboardingStep | null): Promise<void> {
    this.step = step;
    this.step$.changed();
  }

  fail(error: unknown = new Error('disk')) {
    this.step$.fail(error);
  }
}

export class InMemoryRestTimerRepository implements RestTimerRepository {
  private readonly timer$ = new Observable(() => this.timer);

  constructor(public timer: RestTimer = { endsAt: null, notificationPermissionAsked: false }) {}

  observe(observer: Observer<RestTimer>): Unsubscribe {
    return this.timer$.observe(observer);
  }

  async get(): Promise<RestTimer> {
    return this.timer;
  }

  async saveEndsAt(endsAt: Date | null): Promise<void> {
    this.timer = { ...this.timer, endsAt };
    this.timer$.changed();
  }

  async markNotificationPermissionAsked(): Promise<void> {
    this.timer = { ...this.timer, notificationPermissionAsked: true };
    this.timer$.changed();
  }
}

/** Keeps the one notification the system would hold under the fixed id `rest-timer`. */
export class FakeRestNotifier implements RestNotifier {
  scheduled: { at: Date; message: RestMessage } | null = null;

  async schedule(at: Date, message: RestMessage): Promise<void> {
    this.scheduled = { at, message };
  }

  async cancel(): Promise<void> {
    this.scheduled = null;
  }
}

export class FakeDevicePermissions implements DevicePermissions {
  opened: ('notifications' | 'exactAlarms')[] = [];

  constructor(
    public notificationState: NotificationPermission = 'granted',
    public exactAlarms = true,
    /** What the user answers to the system prompt. */
    public answer = true,
  ) {}

  async notifications(): Promise<NotificationPermission> {
    return this.notificationState;
  }

  async requestNotifications(): Promise<boolean> {
    this.notificationState = this.answer ? 'granted' : 'denied';
    return this.answer;
  }

  async canScheduleExactAlarms(): Promise<boolean> {
    return this.exactAlarms;
  }

  async openNotificationSettings(): Promise<void> {
    this.opened.push('notifications');
  }

  async openExactAlarmSettings(): Promise<void> {
    this.opened.push('exactAlarms');
  }
}

export class InMemoryRoutineRepository implements RoutineRepository {
  /** Deleted days stay here, so they still count for the rotation (RN-RUT-01). */
  private readonly deletedDays: RotationDay[] = [];
  private readonly all$ = new Observable(() => [...this.routines]);

  constructor(public routines: Routine[] = []) {}

  observeAll(observer: Observer<Routine[]>): Unsubscribe {
    return this.all$.observe(observer);
  }

  observeById(id: Id, observer: Observer<Routine | null>): Unsubscribe {
    return this.all$.observe({
      next: (routines) => observer.next(routines.find((r) => r.id === id) ?? null),
      error: (error) => observer.error(error),
    });
  }

  observeRotationDays(observer: Observer<RotationDay[]>): Unsubscribe {
    return this.all$.observe({
      next: (routines) =>
        observer.next([...routines.flatMap((r) => rotationDays(r, false)), ...this.deletedDays]),
      error: (error) => observer.error(error),
    });
  }

  async save(routine: Routine): Promise<void> {
    const index = this.routines.findIndex((r) => r.id === routine.id);
    if (index === -1) {
      this.routines.push(routine);
    } else {
      const kept = new Set(routine.days.map((day) => day.id));
      this.deleteDays(this.routines[index].days.filter((day) => !kept.has(day.id)));
      this.routines[index] = routine;
    }
    this.all$.changed();
  }

  async delete(id: Id): Promise<void> {
    this.deleteDays(this.routines.find((r) => r.id === id)?.days ?? []);
    this.routines = this.routines.filter((r) => r.id !== id);
    this.all$.changed();
  }

  fail(error: unknown = new Error('disk')) {
    this.all$.fail(error);
  }

  private deleteDays(days: readonly RoutineDay[]) {
    this.deletedDays.push(...days.map((day) => rotationDay(day, true)));
  }
}

function rotationDays(routine: Routine, isDeleted: boolean): RotationDay[] {
  return routine.days.map((day) => rotationDay(day, isDeleted));
}

function rotationDay({ id, routineId, position }: RoutineDay, isDeleted: boolean): RotationDay {
  return { id, routineId, position, isDeleted };
}

export class InMemoryRoutineTemplateRepository implements RoutineTemplateRepository {
  private readonly all$ = new Observable(() => this.templates);

  constructor(public templates: RoutineTemplate[] = []) {}

  observeAll(observer: Observer<RoutineTemplate[]>): Unsubscribe {
    return this.all$.observe(observer);
  }
}

/** The in-progress workout and the finished ones, with the writes of the workout use cases. */
export class InMemoryWorkoutRepository implements WorkoutRepository {
  private readonly inProgress$ = new Observable(() => this.inProgress);
  private readonly finished$ = new Observable(() => this.finished);

  constructor(
    public inProgress: Workout | null = null,
    public finished: Workout[] = [],
  ) {}

  observeInProgress(observer: Observer<Workout | null>): Unsubscribe {
    return this.inProgress$.observe(observer);
  }

  observeFinished(observer: Observer<Workout[]>): Unsubscribe {
    return this.finished$.observe(observer);
  }

  observeById(id: Id, observer: Observer<Workout | null>): Unsubscribe {
    return this.inProgress$.observe({
      next: (inProgress) =>
        observer.next(
          inProgress?.id === id ? inProgress : (this.finished.find((w) => w.id === id) ?? null),
        ),
      error: (error) => observer.error(error),
    });
  }

  async save(workout: Workout): Promise<void> {
    if (workout.status === 'in_progress') {
      this.inProgress = workout;
    } else {
      if (this.inProgress?.id === workout.id) this.inProgress = null;
      this.finished = [...this.finished.filter((w) => w.id !== workout.id), workout];
      this.finished$.changed();
    }
    this.inProgress$.changed();
  }

  async delete(id: Id): Promise<void> {
    if (this.inProgress?.id === id) this.inProgress = null;
    this.finished = this.finished.filter((w) => w.id !== id);
    this.inProgress$.changed();
    this.finished$.changed();
  }

  fail(error: unknown = new Error('disk')) {
    this.inProgress$.fail(error);
  }

  failFinished(error: unknown = new Error('disk')) {
    this.finished$.fail(error);
  }
}

export class InMemoryAccountRepository implements AccountRepository {
  pendingChanges = 0;
  workoutInProgress = false;
  cleared = 0;
  lastNudgeAt: Date | null = null;

  constructor(public owner: DataOwner = { kind: 'guest' }) {}

  async readOwner(): Promise<DataOwner> {
    return this.owner;
  }

  async saveOwner(owner: DataOwner): Promise<void> {
    this.owner = owner;
  }

  async readLastNudgeAt(): Promise<Date | null> {
    return this.lastNudgeAt;
  }

  async saveLastNudgeAt(at: Date): Promise<void> {
    this.lastNudgeAt = at;
  }

  async countPendingChanges(): Promise<number> {
    return this.pendingChanges;
  }

  async hasWorkoutInProgress(): Promise<boolean> {
    return this.workoutInProgress;
  }

  async clearUserData(): Promise<void> {
    this.cleared += 1;
    this.owner = { kind: 'guest' };
    this.pendingChanges = 0;
  }
}

/** The provider, answering what the test says: `outcome` for sign-up and sign-in. */
export class FakeAuthGateway implements AuthGateway {
  signedOut = 0;
  private readonly lossListeners = new Set<() => void>();
  readonly requests: { kind: 'signUp' | 'signIn'; email: string; password: string }[] = [];
  /** The recovery flow (RF-AUTH-08): what each step answers, and what it was asked. */
  googleOutcome: GoogleOutcome = { status: 'signedIn', userId: 'u1', email: 'ana@gmail.com' };
  googleRequests = 0;
  resetOutcome: PasswordResetOutcome = 'sent';
  linkOutcome: RecoveryLinkOutcome = { status: 'opened', userId: 'u1', email: 'ana@mail.com' };
  newPasswordOutcome: NewPasswordOutcome = { status: 'done', userId: 'u1' };
  readonly resetRequests: string[] = [];
  readonly openedLinks: string[] = [];
  readonly newPasswords: string[] = [];

  constructor(
    public outcome: AuthOutcome = { status: 'signedIn', userId: 'u1' },
    public stored: { userId: string; email: string | null } | null = null,
  ) {}

  async signUp(email: string, password: string): Promise<AuthOutcome> {
    this.requests.push({ kind: 'signUp', email, password });
    return this.outcome;
  }

  async signIn(email: string, password: string): Promise<AuthOutcome> {
    this.requests.push({ kind: 'signIn', email, password });
    return this.outcome;
  }

  async signInWithGoogle(): Promise<GoogleOutcome> {
    this.googleRequests += 1;
    return this.googleOutcome;
  }

  async requestPasswordReset(email: string): Promise<PasswordResetOutcome> {
    this.resetRequests.push(email);
    return this.resetOutcome;
  }

  async openRecoveryLink(url: string): Promise<RecoveryLinkOutcome> {
    this.openedLinks.push(url);
    return this.linkOutcome;
  }

  async setNewPassword(password: string): Promise<NewPasswordOutcome> {
    this.newPasswords.push(password);
    return this.newPasswordOutcome;
  }

  /** The test plays the server refusing to renew the session. */
  loseSession() {
    this.stored = null;
    this.lossListeners.forEach((listener) => listener());
  }

  onSessionLost(listener: () => void): () => void {
    this.lossListeners.add(listener);
    return () => this.lossListeners.delete(listener);
  }

  async signOut(): Promise<void> {
    this.signedOut += 1;
    this.stored = null;
  }

  async storedSession(): Promise<{ userId: string; email: string | null } | null> {
    return this.stored;
  }
}
