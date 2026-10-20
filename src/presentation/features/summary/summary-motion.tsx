import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ENTRANCE_STEP_MS } from '@/presentation/components/motion/entrance';
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
  step: ENTRANCE_STEP_MS,
  /** The main figure counts up meanwhile. */
  countUp: 700,
  /** The success haptic: when the main figure lands. */
  landed: 150 + 700,
} as const;
export const ENTRANCE_TOTAL_MS = ENTRANCE.next + ENTRANCE.step;

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
