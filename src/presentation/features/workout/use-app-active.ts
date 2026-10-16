import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Whether the app is on screen. The clocks of the UI only tick then: in the background nobody sees
 * them, and each tick re-renders (RNF-22, #180). iOS's brief «inactive» (the control center)
 * still counts as on screen.
 */
export function useAppActive(): boolean {
  const [active, setActive] = useState(() => AppState.currentState !== 'background');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) =>
      setActive(status !== 'background'),
    );
    return () => subscription.remove();
  }, []);
  return active;
}
