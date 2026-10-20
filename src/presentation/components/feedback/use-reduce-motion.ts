import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * The system "reduce motion" setting, read once for every component (#248): each one asking on
 * its own resolved a promise per mount and re-rendered it with the same value, which the perf
 * scenarios counted as extra commits after «Hecho». Listeners are only told when it changes.
 */
let reduce = false;
const listeners = new Set<() => void>();
let unsubscribe: (() => void) | null = null;

function set(value: boolean) {
  if (value === reduce) return;
  reduce = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!unsubscribe) {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) set(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', set);
    unsubscribe = () => {
      active = false;
      subscription.remove();
    };
  }
  return () => {
    listeners.delete(listener);
    // Closed a moment later: a component that unsubscribes and subscribes again right away (a
    // remount) keeps the same subscription.
    void Promise.resolve().then(() => {
      if (listeners.size > 0 || !unsubscribe) return;
      unsubscribe();
      unsubscribe = null;
      // Nobody listens: read it again on the next subscription, from the default.
      reduce = false;
    });
  };
}

/** Follows the system "reduce motion" setting (marca §6): decorative animations skip it. */
export function useReduceMotion(): boolean {
  return useSyncExternalStore(subscribe, () => reduce);
}
