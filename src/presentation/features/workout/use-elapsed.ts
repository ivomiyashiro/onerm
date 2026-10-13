import { useEffect, useState } from 'react';

import { elapsed } from '@/presentation/strings/numbers';

/**
 * «18:42» since `startedAt`, ticking every second; null without a start. Right after a start the
 * first tick can lag up to a second (the time never goes below 0:00).
 */
export function useElapsed(startedAt: Date | null): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  return startedAt === null ? null : elapsed(now - startedAt.getTime());
}
