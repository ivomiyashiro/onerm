import { useEffect, useState } from 'react';

import { useAppActive } from '@/presentation/features/workout/use-app-active';

const TICK_MS = 250;

/**
 * RN-ENT-07: what is left of the rest is `end − now`, never a counter. It ticks only while there
 * is an end and the app is on screen (RNF-22); back from the background it is right at once
 * (RF-ENT-06.AC8).
 */
export function useCountdown(endsAt: Date | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  const active = useAppActive();

  useEffect(() => {
    if (endsAt === null || !active) return;
    const tick = () => setNow(Date.now());
    // The first tick right away: `now` may be from long before this rest.
    const first = setTimeout(tick, 0);
    const interval = setInterval(tick, TICK_MS);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [endsAt, active]);

  return endsAt === null ? null : endsAt.getTime() - now;
}
