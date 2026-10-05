import type { Id } from '@/domain/models/vocabulary';
import { areLoadsEqual } from '@/domain/rules/load-equality';
import { estimatedOneRepMax, type E1rm } from '@/domain/rules/suggestion/e1rm';
import type { Exposure } from '@/domain/rules/suggestion/exposures';

interface LoadRecord {
  readonly loadKg: number;
  readonly reps: number;
  readonly at: Date;
}

/** RN-PROG-03, from effective sets only. Each record keeps the first time it was done. */
export interface PersonalRecords {
  /** (a) The highest e1RM, standard or approximate. */
  readonly bestE1rm: (LoadRecord & { readonly e1rm: E1rm }) | null;
  /** (b) The heaviest load with at least 1 rep. */
  readonly heaviestLoad: LoadRecord | null;
  /** (c) The most reps with each load already used, heaviest first. */
  readonly mostRepsByLoad: readonly LoadRecord[];
  /** Bodyweight: the most reps in a set. */
  readonly mostRepsInASet: { readonly reps: number; readonly at: Date } | null;
}

/**
 * RN-PROG-03 over the EE of an exercise, in order. They come from the current data, so a set
 * corrected or deleted later changes them (RF-PROG-05 AC3). Only a strictly better mark replaces
 * a record: a tie keeps the first.
 */
export function personalRecords(exposures: readonly Exposure[]): PersonalRecords {
  let bestE1rm: PersonalRecords['bestE1rm'] = null;
  let heaviestLoad: LoadRecord | null = null;
  const byLoad: LoadRecord[] = [];
  let mostRepsInASet: PersonalRecords['mostRepsInASet'] = null;

  for (const exposure of exposures) {
    const at = exposure.finishedAt;
    for (const { loadKg, reps, rir } of exposure.sets) {
      if (loadKg === null) {
        if (mostRepsInASet === null || reps > mostRepsInASet.reps) mostRepsInASet = { reps, at };
        continue;
      }
      const e1rm = estimatedOneRepMax(loadKg, reps, rir);
      if (e1rm !== null && (bestE1rm === null || e1rm.value > bestE1rm.e1rm.value)) {
        bestE1rm = { loadKg, reps, at, e1rm };
      }
      if (
        heaviestLoad === null ||
        (loadKg > heaviestLoad.loadKg && !areLoadsEqual(loadKg, heaviestLoad.loadKg))
      ) {
        heaviestLoad = { loadKg, reps, at };
      }
      const index = byLoad.findIndex((record) => areLoadsEqual(record.loadKg, loadKg));
      if (index === -1) byLoad.push({ loadKg, reps, at });
      else if (reps > byLoad[index].reps)
        byLoad[index] = { loadKg: byLoad[index].loadKg, reps, at };
    }
  }

  return {
    bestE1rm,
    heaviestLoad,
    mostRepsByLoad: byLoad.sort((a, b) => b.loadKg - a.loadKg),
    mostRepsInASet,
  };
}

/**
 * RN-PROG-03 in the workout summary (RF-ENT-11): whether that workout beat (a) or (b). Only if the
 * exercise had an earlier EE; the first time is not a record.
 */
export function workoutRecords(
  exposures: readonly Exposure[],
  workoutId: Id,
): { e1rm: boolean; heaviestLoad: boolean } {
  const index = exposures.findIndex((exposure) => exposure.workoutId === workoutId);
  if (index <= 0) return { e1rm: false, heaviestLoad: false };
  const before = personalRecords(exposures.slice(0, index));
  const now = personalRecords([exposures[index]]);
  const e1rm =
    now.bestE1rm !== null &&
    (before.bestE1rm === null || now.bestE1rm.e1rm.value > before.bestE1rm.e1rm.value);
  const heaviestLoad =
    now.heaviestLoad !== null &&
    (before.heaviestLoad === null ||
      (now.heaviestLoad.loadKg > before.heaviestLoad.loadKg &&
        !areLoadsEqual(now.heaviestLoad.loadKg, before.heaviestLoad.loadKg)));
  return { e1rm, heaviestLoad };
}
