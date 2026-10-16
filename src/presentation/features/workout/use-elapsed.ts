import { useEffect, useState } from 'react';

import { useOnScreenSince } from '@/presentation/features/workout/use-on-screen-since';

import { elapsed } from '@/presentation/strings/numbers';

/**
 * «18:42» since `startedAt`, ticking every second; null without a start. Right after a start the
 * first tick can lag up to a second (the time never goes below 0:00). It only ticks on screen
 * (RNF-22), and is right at once when the app comes back.
 */
export function useElapsed(startedAt: Date | null): string | null {
  const [now, setNow] = useState(() => Date.now());
  const onScreenSince = useOnScreenSince();
  const active = onScreenSince !== null;
  useEffect(() => {
    if (startedAt === null || !active) return;
    const tick = () => setNow(Date.now());
    // Right away when the app comes back: `now` is from before it left.
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [startedAt, active]);
  return startedAt === null
    ? null
    : elapsed(Math.max(now, onScreenSince ?? now) - startedAt.getTime());
}
