import { useLayoutEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

import { useReduceMotion } from '@/presentation/components/feedback/use-reduce-motion';
import { motion } from '@/presentation/theme/motion';

/**
 * #248: what comes in fades up `rise` dp when it mounts («entrada» token), in one pass. With
 * «reduce motion» it is just there. Remount it (a new `key`) to play it again.
 */
export function Reveal({
  rise = 16,
  style,
  children,
}: {
  rise?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const reduce = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(1));

  useLayoutEffect(() => {
    if (reduce) return;
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: motion.entrance,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => {
      animation.stop();
      progress.setValue(1);
    };
  }, [reduce, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [rise, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
