import type { profiles } from '@/data/db/schema';
import type { SyncValues } from '@/data/db/sync-writes';
import type { Profile } from '@/domain/models/profile';

type ProfileRow = typeof profiles.$inferSelect;

/** Row → profile. Times are ms in the database and `Date` in the domain. */
export function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    level: row.level,
    goal: row.goal,
    daysPerWeek: row.daysPerWeek,
    unit: row.unit,
    effortMode: row.effortMode,
    effortModeExplicit: row.effortModeExplicit,
    loadIncrementsKg: row.loadIncrementsKg,
    loadIncrementsLb: row.loadIncrementsLb,
    barWeightKg: row.barWeightKg,
    barWeightLb: row.barWeightLb,
    activeRoutineId: row.activeRoutineId,
    onboardingCompletedAt:
      row.onboardingCompletedAt === null ? null : new Date(row.onboardingCompletedAt),
  };
}

/** Profile → the columns the repository writes (the sync columns are set by writeSyncRow). */
export function fromProfile(profile: Profile): SyncValues<typeof profiles> {
  return {
    ...profile,
    onboardingCompletedAt: profile.onboardingCompletedAt?.getTime() ?? null,
  };
}
