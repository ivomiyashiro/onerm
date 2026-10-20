import { Easing, type Animated } from 'react-native';

/** How far the screen rises while it fades in. */
const RISE = 8;
/** The cross-fade, between the «estado» and «entrada» tokens. */
const FADE_MS = 260;

/**
 * #248 M7: changing tabs cross-fades the screens, and the one coming in rises 8 dp. The tab bar
 * stays still (its pill slides, M4). With «reduce motion», only the fade. Screens pushed over
 * the tabs (S09, details, sheets) keep their native transition.
 */
export function tabTransition(reduceMotion: boolean) {
  return {
    animation: 'fade',
    transitionSpec: {
      animation: 'timing',
      config: { duration: FADE_MS, easing: Easing.out(Easing.cubic) },
    },
    sceneStyleInterpolator: ({
      current,
    }: {
      current: { progress: Animated.AnimatedInterpolation<number> };
    }) => ({
      sceneStyle: {
        // -1 and 1 are the screens on each side, 0 the focused one.
        opacity: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [0, 1, 0],
        }),
        transform: reduceMotion
          ? []
          : [
              {
                translateY: current.progress.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [RISE, 0, RISE],
                }),
              },
            ],
      },
    }),
  } as const;
}
