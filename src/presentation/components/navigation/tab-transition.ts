import { Easing, type Animated } from 'react-native';

import { colors } from '@/presentation/theme';

/** How far the screen rises while it fades in. */
const RISE = 8;
/** The whole change: the old screen fades out in its first half, the new one in the second. */
const FADE_MS = 300;

/**
 * #248 M7: changing tabs cross-fades the screens, and the one coming in rises 8 dp. The tab bar
 * stays still (its pill slides, M4). With «reduce motion», only the fade. Screens pushed over
 * the tabs (S09, details, sheets) keep their native transition.
 */
export function tabTransition(reduceMotion: boolean) {
  return {
    // The scenes come with the light background of the default navigation theme: it showed grey
    // while they faded.
    sceneStyle: { backgroundColor: colors.bgBase },
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
        // -1 and 1 are the screens on each side, 0 the focused one. The one leaving is gone
        // halfway and only then the new one fades in: crossed at half opacity, their texts mixed.
        opacity: current.progress.interpolate({
          inputRange: [-1, -0.5, 0, 0.5, 1],
          outputRange: [0, 0, 1, 0, 0],
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
