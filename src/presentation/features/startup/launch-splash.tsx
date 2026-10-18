import * as SplashScreen from 'expo-splash-screen';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import Halo from '@/presentation/components/brand/svg/halo.svg';
import Mark from '@/presentation/components/brand/svg/logo-mark.svg';
import { useReduceMotion } from '@/presentation/components/feedback/use-reduce-motion';
import { colors } from '@/presentation/theme';

/** Figma «10 Ícono y splash»: the mark at the native splash's 96 dp, and its halo behind. */
const MARK = 96;
const HALO = 160;
const HALO_MS = 600;
const EXIT_MS = 360;
const REDUCED_EXIT_MS = 200;

const MarkReady = createContext<() => void>(() => {});

/**
 * The animated splash (marca §16). It starts as the same frame as the native one and hides it, so
 * the switch can't be seen; a halo grows behind the mark while the database opens. When the app
 * is ready it mounts underneath and this layer fades over it: the app shows as soon as before.
 */
export function LaunchSplashProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  // Stable, so a re-render doesn't restart the exit halfway.
  const markReady = useCallback(() => setReady(true), []);
  const onHidden = useCallback(() => setHidden(true), []);

  return (
    <MarkReady.Provider value={markReady}>
      {children}
      {!hidden && <LaunchSplash ready={ready} onHidden={onHidden} />}
    </MarkReady.Provider>
  );
}

/** Rendered by what the app shows first (the navigator or a startup error): the splash leaves. */
export function LaunchReady() {
  const markReady = useContext(MarkReady);
  useEffect(markReady, [markReady]);
  return null;
}

function LaunchSplash({ ready, onHidden }: { ready: boolean; onHidden: () => void }) {
  const reduceMotion = useReduceMotion();
  const [halo] = useState(() => new Animated.Value(0));
  const [exit] = useState(() => new Animated.Value(0));

  // A single pass (marca §7): if the database takes longer, the mark just waits.
  useEffect(() => {
    if (reduceMotion) return;
    const animation = Animated.timing(halo, {
      toValue: 1,
      duration: HALO_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [halo, reduceMotion]);

  useEffect(() => {
    if (!ready) return;
    const animation = Animated.timing(exit, {
      toValue: 1,
      duration: reduceMotion ? REDUCED_EXIT_MS : EXIT_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => finished && onHidden());
    return () => animation.stop();
  }, [exit, ready, reduceMotion, onHidden]);

  // With "reduce motion" the mark doesn't grow: the layer only fades.
  const scale = reduceMotion ? 1 : exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });

  return (
    <Animated.View
      testID="launch-splash"
      // Decorative, and it never blocks a touch on the app fading in underneath.
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={() => SplashScreen.hide()}
      style={[
        styles.layer,
        { opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
      ]}
    >
      {!reduceMotion && (
        <Animated.View
          testID="launch-splash-halo"
          style={[
            styles.halo,
            {
              opacity: halo,
              transform: [
                { scale: halo.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
              ],
            },
          ]}
        >
          <Halo width={HALO} height={HALO} />
        </Animated.View>
      )}
      <Animated.View style={{ transform: [{ scale }] }}>
        <Mark width={MARK} height={MARK} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgBase,
  },
  halo: { position: 'absolute' },
});
