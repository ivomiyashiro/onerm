import type { LoadIncrements, Profile } from '@/domain/models/profile';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import { firstValue } from '@/domain/usecases/observe-together';

/** An equipment's increment, or the bar weight. */
export type LoadSetting = keyof LoadIncrements | 'bar';

/** The largest value accepted, in either unit: well above any real increment or bar. */
export const LOAD_SETTING_MAX: Record<'increment' | 'bar', number> = { increment: 50, bar: 100 };

/**
 * RF-PERF-06 and RN-PERF-08: an increment or the bar weight, in the active unit. Each unit has
 * its own values, so changing one never converts the other (RN-PERF-06).
 */
export class UpdateLoadSetting {
  constructor(private readonly profiles: Pick<ProfileRepository, 'observe' | 'save'>) {}

  async execute(setting: LoadSetting, value: number): Promise<void> {
    const max = LOAD_SETTING_MAX[setting === 'bar' ? 'bar' : 'increment'];
    if (!(value > 0 && value <= max)) {
      throw new RangeError(`${setting} must be more than 0 and at most ${max}, got ${value}`);
    }
    const profile = await firstValue<Profile | null>((o) => this.profiles.observe(o));
    if (profile === null) throw new Error('There is no profile to update');
    await this.profiles.save(withLoadSetting(profile, setting, value));
  }
}

function withLoadSetting(profile: Profile, setting: LoadSetting, value: number): Profile {
  const kg = profile.unit === 'kg';
  if (setting === 'bar') {
    return kg ? { ...profile, barWeightKg: value } : { ...profile, barWeightLb: value };
  }
  return kg
    ? { ...profile, loadIncrementsKg: { ...profile.loadIncrementsKg, [setting]: value } }
    : { ...profile, loadIncrementsLb: { ...profile.loadIncrementsLb, [setting]: value } };
}
