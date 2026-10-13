import type { Profile } from '@/domain/models/profile';
import type { EffortMode, ExperienceLevel } from '@/domain/models/vocabulary';

/** What the onboarding (S05) and the settings (S21) change in the profile. */
export type ProfileChanges = Partial<
  Pick<Profile, 'level' | 'goal' | 'daysPerWeek' | 'unit' | 'effortMode'>
>;

/** RN-PERF-04: a novice reports effort with the simple scale; the rest, with numeric RIR. */
const defaultEffortMode = (level: ExperienceLevel): EffortMode =>
  level === 'novice' ? 'simple' : 'rir';

/**
 * Applies the changes. A new level brings its default effort mode unless the user chose one by
 * hand, and choosing one marks it as explicit (RN-PERF-04, RF-PERF-05.AC2).
 */
export function withProfileChanges(profile: Profile, changes: ProfileChanges): Profile {
  const next = { ...profile, ...changes };
  if (changes.effortMode !== undefined) return { ...next, effortModeExplicit: true };
  if (changes.level !== undefined && !profile.effortModeExplicit) {
    return { ...next, effortMode: defaultEffortMode(changes.level) };
  }
  return next;
}
