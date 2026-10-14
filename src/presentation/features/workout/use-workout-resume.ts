import { useEffect, useEffectEvent, useState } from 'react';

import type { Id } from '@/domain/models/vocabulary';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export interface WorkoutResume {
  /** D02: a workout in progress started more than 12 h ago (RN-ENT-11). */
  abandoned: { startedAt: Date; sets: number } | null;
  actions: {
    /** «Finalizarlo»: it ends at its last set (RN-ENT-11). */
    finish(): Promise<void>;
    continue(): void;
    discard(): Promise<void>;
    /** Back: D02 closes and the workout stays in progress. */
    dismiss(): void;
  };
}

/**
 * RF-ENT-13: on opening the app, a workout in progress opens S09 again (AC1), or D02 asks when it
 * was abandoned (AC2). Read once: coming back to the tabs later never asks again.
 */
export function useWorkoutResume({
  onResume,
  onFinished,
}: {
  onResume: () => void;
  onFinished: (workoutId: Id) => void;
}): WorkoutResume {
  const { readWorkoutResume, finishWorkout, discardWorkout } = useUseCases();
  const [abandoned, setAbandoned] = useState<WorkoutResume['abandoned']>(null);
  // The route's callbacks are new functions on every render; the read runs once.
  const resume = useEffectEvent(() => onResume());

  useEffect(() => {
    let active = true;
    void readWorkoutResume.execute().then((found) => {
      if (!active) return;
      if (found.kind === 'resume') resume();
      if (found.kind === 'abandoned') {
        setAbandoned({ startedAt: found.startedAt, sets: found.sets });
      }
    });
    return () => {
      active = false;
    };
  }, [readWorkoutResume]);

  return {
    abandoned,
    actions: {
      async finish() {
        setAbandoned(null);
        const id = await finishWorkout.execute({ abandoned: true });
        if (id !== null) onFinished(id);
      },
      continue() {
        setAbandoned(null);
        onResume();
      },
      async discard() {
        setAbandoned(null);
        await discardWorkout.execute();
      },
      dismiss: () => setAbandoned(null),
    },
  };
}
