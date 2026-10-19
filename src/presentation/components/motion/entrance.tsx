import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, type StyleProp, type TextStyle } from 'react-native';

import { Text } from '@/presentation/components/text';

/**
 * The entrance of S12 and S07 (#223, #225): blocks fade up in turn, in one short pass under 1 s
 * (marca §7, decorative), and none of it with «reduce motion».
 */
export const ENTRANCE_STEP_MS = 300;
const RISE = 12;

/** The progress of a whole entrance of `totalMs`, 0 to 1, run once; at 1 with «reduce motion». */
export function useEntrance(animate: boolean, totalMs: number): Animated.Value {
  const [progress] = useState(() => new Animated.Value(animate ? 0 : 1));
  useEffect(() => {
    if (!animate) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: totalMs,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [animate, progress, totalMs]);
  return progress;
}

/** A block of an entrance of `totalMs`: it fades up from `at` ms, for one step. */
export function EntranceStep({
  progress,
  at,
  totalMs,
  children,
}: {
  progress: Animated.Value;
  at: number;
  totalMs: number;
  children: ReactNode;
}) {
  const inputRange = [at / totalMs, Math.min(1, (at + ENTRANCE_STEP_MS) / totalMs)];
  const ease = { inputRange, extrapolate: 'clamp' } as const;
  return (
    <Animated.View
      style={{
        opacity: progress.interpolate({ ...ease, outputRange: [0, 1] }),
        transform: [{ translateY: progress.interpolate({ ...ease, outputRange: [RISE, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

/**
 * A number that counts from 0 to `value` once in `durationMs`, easing out; a leaf, so only its text
 * renders while it counts (#229). Without `animate`, or once it counted, it shows `value` as it is.
 */
export function CountUp({
  value,
  format,
  animate,
  delayMs,
  durationMs,
  style,
}: {
  value: number;
  format: (value: number) => string;
  animate: boolean;
  delayMs: number;
  durationMs: number;
  style: StyleProp<TextStyle>;
}) {
  const [shown, setShown] = useState(0);
  const [counted, setCounted] = useState(false);
  useEffect(() => {
    if (!animate || counted) return;
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now + delayMs;
      const t = Math.min(1, Math.max(0, (now - start) / durationMs));
      setShown(value * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
      else setCounted(true);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, counted, delayMs, durationMs, value]);
  return <Text style={style}>{format(animate && !counted ? shown : value)}</Text>;
}
