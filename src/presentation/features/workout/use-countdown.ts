import { useEffect, useState } from 'react';

import { useOnScreenSince } from '@/presentation/features/workout/use-on-screen-since';

const TICK_MS = 250;

/**
 * RN-ENT-07: what is left of the rest is `end − now`, never a counter. It ticks only while there
 * is an end and the app is on screen (RNF-22); back from the background it is right at once
 * (RF-ENT-06.AC8). It checks every 250 ms but renders only when the second shown changes (#229).
 */
export function useCountdown(endsAt: Date | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  const onScreenSince = useOnScreenSince();
  const active = onScreenSince !== null;
  // The instant, not the object: a new `Date` with the same end doesn't restart the clock.
  const end = endsAt?.getTime() ?? null;

  useEffect(() => {
    if (end === null || !active) return;
    const second = (at: number) => Math.ceil((end - at) / 1000);
    let shown: number | null = null;
    // Only a new second is set: even the same state can cost React a render.
    const tick = () => {
      const at = Date.now();
      if (second(at) === shown) return;
      shown = second(at);
      setNow(at);
    };
    // The first tick right away: `now` may be from long before this rest.
    const first = setTimeout(tick, 0);
    const interval = setInterval(tick, TICK_MS);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [end, active]);

  // Back on screen, `now` is still from before it left until the first tick.
  return end === null ? null : end - Math.max(now, onScreenSince ?? now);
}
