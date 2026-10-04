import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

import { Icon } from '@/presentation/components/icons/icon';

/** The Figma spinner (18 dp), turning once per second. */
export function Spinner({ color }: { color: string }) {
  const [turn] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(turn, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [turn]);

  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Icon name="spinner" size={18} color={color} />
    </Animated.View>
  );
}
