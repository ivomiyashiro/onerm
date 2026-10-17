import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Since when the app is on screen (ms), or null in the background. The clocks of the UI only tick
 * on screen: in the background nobody sees them, and each tick re-renders (RNF-22, #180). The
 * moment it came back lets the first render be right, before the next tick. iOS's brief
 * «inactive» (the control center) still counts as on screen.
 */
export function useOnScreenSince(): number | null {
  const [since, setSince] = useState(() =>
    AppState.currentState === 'background' ? null : Date.now(),
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) =>
      setSince((current) => (status === 'background' ? null : (current ?? Date.now()))),
    );
    return () => subscription.remove();
  }, []);
  return since;
}
