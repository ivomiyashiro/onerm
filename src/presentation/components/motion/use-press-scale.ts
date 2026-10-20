import { useState } from 'react';
import { Animated, Easing } from 'react-native';

import { useReduceMotion } from '@/presentation/components/feedback/use-reduce-motion';
import { motion, spring } from '@/presentation/theme/motion';

/**
 * A control that sinks to `to` while pressed (the «presión» token) and comes back with a spring
 * (#248, M1 and M2). With «reduce motion» it still sinks, at once: the press stays visible.
 */
export function usePressScale(to: number) {
  const reduce = useReduceMotion();
  const [scale] = useState(() => new Animated.Value(1));

  function onPressIn() {
    if (reduce) return scale.setValue(to);
    Animated.timing(scale, {
      toValue: to,
      duration: motion.press,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function onPressOut() {
    if (reduce) return scale.setValue(1);
    Animated.spring(scale, { toValue: 1, ...spring, useNativeDriver: true }).start();
  }

  return { style: { transform: [{ scale }] }, onPressIn, onPressOut };
}
