import { useEffect, useState } from 'react';
import { Animated, Easing, useWindowDimensions } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';

import { useReduceMotion } from '@/presentation/components/feedback/use-reduce-motion';
import { motion, spring } from '@/presentation/theme/motion';

/** How far the exercise has to be swiped to change it (08 §5). */
const SWIPE_DISTANCE = 64;
/** The swipe starts after this much sideways, and gives way to the scroll after this much down. */
const SWIPE_START = 24;
const SCROLL_START = 12;
/** At the first and the last exercise the page only gives a little, and comes back. */
const EDGE_GIVE = 24;
const EDGE_RESISTANCE = 0.25;

/**
 * #258, 08 §5: swiping changes the exercise like turning a page. The page follows the finger; past
 * the threshold it leaves towards the side of the gesture and the new one comes in from the
 * opposite side; short of it, it springs back. With «reduce motion» nothing moves: the change is a
 * short fade. The gesture runs on the JS thread but only sets an `Animated.Value` (native driver):
 * no frame re-renders the screen.
 */
export function useExerciseSwipe({
  exerciseIndex,
  count,
  goTo,
}: {
  exerciseIndex: number;
  count: number;
  goTo: (index: number) => void;
}) {
  const reduce = useReduceMotion();
  const { width } = useWindowDimensions();
  const [x] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));
  // The new exercise is on the screen, while the page waits off the opposite side (or transparent):
  // it comes in. Anywhere else (a jump from «Ver todos») both values already rest, and it is a no-op.
  useEffect(() => {
    const animation = reduce
      ? Animated.timing(fade, {
          toValue: 1,
          duration: motion.state / 2,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      : Animated.spring(x, { toValue: 0, ...spring, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [exerciseIndex, reduce, x, fade]);

  const back = () => Animated.spring(x, { toValue: 0, ...spring, useNativeDriver: true }).start();

  const gesture = Gesture.Pan()
    .runOnJS(true)
    .withTestId('swipe exercise')
    .activeOffsetX([-SWIPE_START, SWIPE_START])
    .failOffsetY([-SCROLL_START, SCROLL_START])
    .onUpdate(({ translationX }) => {
      if (reduce) return;
      const to = exerciseIndex + (translationX < 0 ? 1 : -1);
      const exists = to >= 0 && to < count;
      x.setValue(
        exists
          ? translationX
          : Math.sign(translationX) * Math.min(Math.abs(translationX) * EDGE_RESISTANCE, EDGE_GIVE),
      );
    })
    .onEnd(({ translationX }) => {
      const to = exerciseIndex + (translationX < 0 ? 1 : -1);
      if (Math.abs(translationX) < SWIPE_DISTANCE || to < 0 || to >= count) {
        if (!reduce) back();
        return;
      }
      const side = translationX < 0 ? -1 : 1;
      const leave = reduce
        ? Animated.timing(fade, {
            toValue: 0,
            duration: motion.state / 2,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          })
        : Animated.timing(x, {
            toValue: side * width,
            duration: motion.state / 2,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          });
      leave.start(({ finished }) => {
        if (!finished) return;
        if (!reduce) x.setValue(-side * width);
        goTo(to);
      });
    });

  const style = {
    opacity: fade,
    transform: [{ translateX: x }],
  };
  return { gesture, style };
}
