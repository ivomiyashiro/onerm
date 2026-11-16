import { useEffect, useRef } from 'react';
import { Vibration } from 'react-native';

import { useCountdown } from '@/presentation/components/clock/use-countdown';
import { useOnScreenSince } from '@/presentation/components/clock/use-on-screen-since';
import { REST_END_VIBRATION } from '@/presentation/features/workout/workout-vibration';

/**
 * RF-ENT-06.AC6: at zero the rest closes on its own, with a vibration once if it ended with the app
 * open (not when opening an old one, nor when coming back to one that ended in the background: the
 * notification already said so). A leaf with its own countdown, so its ticks render nothing else
 * (#229).
 */
export function RestEnd({ endsAt, onEnd }: { endsAt: Date | null; onEnd: (endsAt: Date) => void }) {
  const remaining = useCountdown(endsAt);
  const restEnded = remaining !== null && remaining <= 0;
  const onScreen = useOnScreenSince() !== null;
  const wasRunning = useRef(false);
  useEffect(() => {
    if (endsAt === null || remaining === null || !onScreen) {
      wasRunning.current = false;
      return;
    }
    if (!restEnded) {
      wasRunning.current = true;
      return;
    }
    if (wasRunning.current) Vibration.vibrate(REST_END_VIBRATION);
    wasRunning.current = false;
    onEnd(endsAt);
  }, [endsAt, remaining, restEnded, onScreen, onEnd]);
  return null;
}
