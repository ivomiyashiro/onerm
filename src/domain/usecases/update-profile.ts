import type { Profile } from '@/domain/models/profile';
import type { Routine } from '@/domain/models/routine';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type { RoutineRepository } from '@/domain/repositories/routine-repository';
import { withProfileChanges, type ProfileChanges } from '@/domain/rules/profile/profile-changes';
import { firstValue } from '@/domain/usecases/observe-together';

/** RN-PERF-03: D06 is offered when the routine's prescription may no longer fit. */
export interface ProfileUpdate {
  readonly offerAdjust: boolean;
}

const MIN_DAYS = 2;
const MAX_DAYS = 6;

/**
 * RF-PERF-03..05: a setting of S21, saved locally at once. The routine never changes by itself:
 * a new goal or level with an active routine offers D06 instead (AC2).
 */
export class UpdateProfile {
  constructor(
    private readonly profiles: Pick<ProfileRepository, 'observe' | 'save'>,
    private readonly routines: Pick<RoutineRepository, 'observeById'>,
  ) {}

  async execute(changes: ProfileChanges): Promise<ProfileUpdate> {
    const { daysPerWeek } = changes;
    if (daysPerWeek !== undefined && !(daysPerWeek >= MIN_DAYS && daysPerWeek <= MAX_DAYS)) {
      throw new RangeError(`daysPerWeek must be ${MIN_DAYS}–${MAX_DAYS}, got ${daysPerWeek}`);
    }
    const profile = await firstValue<Profile | null>((o) => this.profiles.observe(o));
    if (profile === null) throw new Error('There is no profile to update');
    await this.profiles.save(withProfileChanges(profile, changes));

    const prescriptionMayChange =
      (changes.goal !== undefined && changes.goal !== profile.goal) ||
      (changes.level !== undefined && changes.level !== profile.level);
    return { offerAdjust: prescriptionMayChange && (await this.hasActiveRoutine(profile)) };
  }

  private async hasActiveRoutine({ activeRoutineId }: Profile): Promise<boolean> {
    if (activeRoutineId === null) return false;
    const routine = await firstValue<Routine | null>((o) =>
      this.routines.observeById(activeRoutineId, o),
    );
    return routine !== null;
  }
}
