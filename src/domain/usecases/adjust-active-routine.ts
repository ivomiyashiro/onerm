import type { Profile } from '@/domain/models/profile';
import type { Routine } from '@/domain/models/routine';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type { RoutineRepository } from '@/domain/repositories/routine-repository';
import { prescriptionFor } from '@/domain/rules/routine/prescription-defaults';
import { firstValue } from '@/domain/usecases/observe-together';

/**
 * D06 «Ajustar» (RF-PERF-03.AC2): rewrites the prescription of every exercise of the active
 * routine for the profile's goal and level (RN-PERF-03), keeping each one's role and sets (at
 * most 3 with the strength goal, C-10). Exercises, order and notes stay as they are.
 */
export class AdjustActiveRoutine {
  constructor(
    private readonly profiles: Pick<ProfileRepository, 'observe'>,
    private readonly routines: Pick<RoutineRepository, 'observeById' | 'save'>,
  ) {}

  async execute(): Promise<void> {
    const profile = await firstValue<Profile | null>((o) => this.profiles.observe(o));
    const activeRoutineId = profile?.activeRoutineId ?? null;
    if (profile === null || activeRoutineId === null) return;
    const routine = await firstValue<Routine | null>((o) =>
      this.routines.observeById(activeRoutineId, o),
    );
    if (routine === null) return;

    await this.routines.save({
      ...routine,
      days: routine.days.map((day) => ({
        ...day,
        exercises: day.exercises.map((exercise) => ({
          ...exercise,
          prescription: prescriptionFor(exercise.prescription, profile),
        })),
      })),
    });
  }
}
