import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, type StyleProp, type TextStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/presentation/components/text';
import { colors } from '@/presentation/theme';

/**
 * #223: S12 enters in one short pass (marca §7, decorative): each block fades up in its turn and
 * the whole entrance ends before 1 s. Times in ms from the start.
 */
export const ENTRANCE = {
  header: 0,
  numbers: 150,
  records: 300,
  list: 450,
  next: 600,
  /** Each block takes this long to come in. */
  step: 300,
  /** The main figure counts up meanwhile. */
  countUp: 700,
} as const;
const TOTAL_MS = ENTRANCE.next + ENTRANCE.step;
const RISE = 12;

/** The progress of the whole entrance, 0 to 1, run once; already at 1 with «reduce motion». */
export function useEntrance(animate: boolean): Animated.Value {
  const [progress] = useState(() => new Animated.Value(animate ? 0 : 1));
  useEffect(() => {
    if (!animate) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: TOTAL_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [animate, progress]);
  return progress;
}

/** A block of the entrance: it fades up from `at` ms, for one step. */
export function EntranceStep({
  progress,
  at,
  children,
}: {
  progress: Animated.Value;
  at: number;
  children: ReactNode;
}) {
  const inputRange = [at / TOTAL_MS, (at + ENTRANCE.step) / TOTAL_MS];
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
 * A number that counts from 0 to `value` once, easing out; a leaf, so only its text renders while
 * it counts (#229). Without `animate` it shows `value` at once.
 */
export function CountUp({
  value,
  format,
  animate,
  delayMs,
  style,
}: {
  value: number;
  format: (value: number) => string;
  animate: boolean;
  delayMs: number;
  style: StyleProp<TextStyle>;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!animate) return;
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now + delayMs;
      const t = Math.min(1, Math.max(0, (now - start) / ENTRANCE.countUp));
      setShown(value * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, delayMs, value]);
  return <Text style={style}>{format(animate ? shown : value)}</Text>;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const MARK = 64;
const CHECK = 'M20 33 L28.5 41.5 L45 24';
const CHECK_LENGTH = 36;

/** The «done» mark: a lime disc whose check draws itself once (like the splash of #216). */
export function DoneMark({ animate }: { animate: boolean }) {
  const [drawn] = useState(() => new Animated.Value(animate ? 0 : 1));
  useEffect(() => {
    if (!animate) return;
    const animation = Animated.timing(drawn, {
      toValue: 1,
      duration: ENTRANCE.step + 150,
      delay: 100,
      easing: Easing.out(Easing.cubic),
      // An SVG prop: not on the native driver.
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [animate, drawn]);
  const check = {
    d: CHECK,
    stroke: colors.textOnAccent,
    strokeWidth: 5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
    strokeDasharray: CHECK_LENGTH,
  } as const;
  return (
    <Svg width={MARK} height={MARK} accessible={false}>
      <Circle cx={MARK / 2} cy={MARK / 2} r={MARK / 2} fill={colors.bgAccent} />
      {animate ? (
        <AnimatedPath
          {...check}
          strokeDashoffset={drawn.interpolate({
            inputRange: [0, 1],
            outputRange: [CHECK_LENGTH, 0],
          })}
        />
      ) : (
        // «Reduce motion» is read after the first render: then the check is drawn whole.
        <Path {...check} strokeDashoffset={0} />
      )}
    </Svg>
  );
}
