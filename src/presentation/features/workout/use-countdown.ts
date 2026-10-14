import { useEffect, useState } from 'react';

const TICK_MS = 250;

/**
 * RN-ENT-07: what is left of the rest is `end − now`, never a counter. It ticks only while there
 * is an end; back from the background it is right at once (RF-ENT-06.AC8).
 */
export function useCountdown(endsAt: Date | null): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => setNow(Date.now());
    // The first tick right away: `now` may be from long before this rest.
    const first = setTimeout(tick, 0);
    const interval = setInterval(tick, TICK_MS);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [endsAt]);

  return endsAt === null ? null : endsAt.getTime() - now;
}
