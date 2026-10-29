import { useEffect, useState } from 'react';

import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export interface VideoLinkViewModel {
  /**
   * True once the device reports it has no connection (RF-CAT-02 AC6). Until it reports anything
   * the video stays available: the app may have started online, which isn't reported as a
   * reconnection.
   */
  offline: boolean;
}

/** «Ver un video» of S17 and S26: the only part of the help that needs a connection. */
export function useVideoLinkViewModel(): VideoLinkViewModel {
  const { observeSyncActivity } = useUseCases();
  const [offline, setOffline] = useState(false);
  // A boolean: React skips the render when it didn't change.
  useEffect(
    () => observeSyncActivity.execute(({ online }) => setOffline(online === false)),
    [observeSyncActivity],
  );
  return { offline };
}
