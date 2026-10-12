import type { Profile } from '@/domain/models/profile';
import type { Id } from '@/domain/models/vocabulary';

/** RN-AUTH-06: the guest's profile has this fixed local id. */
export const GUEST_PROFILE_ID: Id = 'guest';

/**
 * The profile before the onboarding answers anything: RN-PERF-02 (novice, general health, 3 days),
 * RN-PERF-04 (a novice uses the simple scale), RF-PERF-04.AC1 (kg), RN-PERF-06 and RN-PERF-08
 * (increments and bar). The onboarding stays pending: skipping it or answering fills it in (#30).
 */
export function defaultProfile(): Profile {
  return {
    id: GUEST_PROFILE_ID,
    level: 'novice',
    goal: 'health',
    daysPerWeek: 3,
    unit: 'kg',
    effortMode: 'simple',
    effortModeExplicit: false,
    loadIncrementsKg: { barbell: 2.5, dumbbell: 2, cable: 2.5, machine: 5, kettlebell: 4 },
    loadIncrementsLb: { barbell: 5, dumbbell: 5, cable: 5, machine: 10, kettlebell: 10 },
    barWeightKg: 20,
    barWeightLb: 45,
    activeRoutineId: null,
    onboardingCompletedAt: null,
  };
}
