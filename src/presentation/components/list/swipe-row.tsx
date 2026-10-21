import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type AccessibilityActionInfo,
  type GestureResponderEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useReduceMotion } from '@/presentation/components/feedback/use-reduce-motion';
import { Icon, type IconName } from '@/presentation/components/icons/icon';
import { colors, radius, size, space } from '@/presentation/theme';

export interface SwipeAction {
  /** The accessibility action's name. */
  key: string;
  label: string;
  icon: IconName;
  destructive?: boolean;
  onPress: () => void;
}

/** What the row's focusable element spreads, so a screen reader offers the same actions. */
export interface SwipeA11y {
  accessibilityActions: AccessibilityActionInfo[];
  onAccessibilityAction: (event: AccessibilityActionEvent) => void;
}

/** #254: each action is a round 48 dp target (RNF-16), its name left to the screen reader. */
const ACTION_SIZE = size.targetMin;
/** #251: the space before each action, so they read as buttons apart from the row; #261: and after
 * the last one, so it doesn't touch the edge of the list. */
const ACTION_GAP = space.s8;
/** The swipe starts after this much sideways, and gives way to the scroll after this much down. */
const SWIPE_START = 16;
const SCROLL_START = 10;
/** A quick flick opens it even if short (pt/s). */
const FLICK = 500;

/**
 * #198: the one pattern to edit and delete in a list, like iOS: swiping the row left uncovers its
 * actions; an action, or swiping back, closes it. Screen readers get the same actions on the row
 * (RNF-18): `children` receives them to spread on its focusable element.
 *
 * #251: nothing clips the row, so it moves whole, with its four corners, and leaves through the
 * edge of the screen; the actions are separate buttons that come in with it from the right.
 *
 * #254: once the touch is a swipe, the row takes it from its content, so lifting the finger never
 * presses the row (iOS let the content's press through, since it moved under the finger).
 *
 * #257: the tabs stay mounted behind the active one, so a row left open would still be open on
 * coming back: it closes, without animation, when its screen loses focus.
 *
 * The actions grow in, with the finger, filling the space the row uncovers, like iOS; with «reduce
 * motion» they stay in place and only fade. While it is
 * swiped or open the row is tinted, so it's clear which one the actions belong to.
 */
export function SwipeRow({
  actions,
  testID,
  radius: rowRadius = radius.lg,
  children,
}: {
  actions: SwipeAction[];
  /** The gesture is `swipe {testID}` in tests. */
  testID: string;
  /** The row's corner radius, for the tint to follow its shape. */
  radius?: number;
  children: (a11y: SwipeA11y) => ReactNode;
}) {
  const width = actions.length * (ACTION_GAP + ACTION_SIZE) + ACTION_GAP;
  const reduce = useReduceMotion();
  const [x] = useState(() => new Animated.Value(0));
  const [open, setOpen] = useState(false);
  // Drawn from the first move, so the swipe uncovers them; gone again once it closed.
  const [shown, setShown] = useState(false);
  // At rest they sit under the row: invisible until it moves, so they don't show at its rounded
  // corners while the spring settles (#254). The same curve tints the row.
  const [fade] = useState(() =>
    x.interpolate({ inputRange: [-ACTION_SIZE, 0], outputRange: [1, 0], extrapolate: 'clamp' }),
  );
  // How much of the actions' space the row uncovered, from 0 to 1.
  const [progress] = useState(() =>
    x.interpolate({ inputRange: [-width, 0], outputRange: [1, 0], extrapolate: 'clamp' }),
  );
  // The actions shrink towards the list's edge by that much: each one moves towards it as far as it
  // scales, so together they always fill the uncovered space, never under the row or past the edge.
  const [grow] = useState(() =>
    actions.map((_, index) => {
      const fromRight = actions.length - 1 - index;
      const center = fromRight * (ACTION_GAP + ACTION_SIZE) + ACTION_GAP + ACTION_SIZE / 2;
      return x.interpolate({
        inputRange: [-width, 0],
        outputRange: [0, center],
        extrapolate: 'clamp',
      });
    }),
  );

  const snap = (opened: boolean) => {
    setOpen(opened);
    Animated.spring(x, {
      toValue: opened ? -width : 0,
      useNativeDriver: true,
      bounciness: 0,
    }).start(({ finished }) => {
      if (finished && !opened) setShown(false);
    });
  };
  const focused = useIsFocused();
  const [wasFocused, setWasFocused] = useState(focused);
  if (focused !== wasFocused) {
    setWasFocused(focused);
    if (!focused) {
      setOpen(false);
      setShown(false);
    }
  }
  useEffect(() => {
    if (focused) return;
    x.stopAnimation();
    x.setValue(0);
  }, [focused, x]);
  const from = open ? -width : 0;
  const swipe = Gesture.Pan()
    .runOnJS(true)
    .withTestId(`swipe ${testID}`)
    // Closed, only leftwards: a swipe to the right is left to the screen (S09 changes exercise).
    .activeOffsetX(open ? [-SWIPE_START, SWIPE_START] : -SWIPE_START)
    .failOffsetX(open ? [-Infinity, Infinity] : SWIPE_START)
    .failOffsetY([-SCROLL_START, SCROLL_START])
    .onStart(() => setShown(true))
    .onUpdate(({ translationX }) => x.setValue(Math.min(0, Math.max(-width, from + translationX))))
    .onEnd(({ translationX, velocityX }) =>
      snap(from + translationX < -width / 2 || velocityX < -FLICK),
    );

  // Where the touch started, to tell a swipe from a press. Same offsets as the gesture.
  const start = useRef({ x: 0, y: 0 });
  const touchStarts = ({ nativeEvent }: GestureResponderEvent) => {
    start.current = { x: nativeEvent.pageX, y: nativeEvent.pageY };
    return false;
  };
  const isSwipe = ({ nativeEvent }: GestureResponderEvent) => {
    const dx = nativeEvent.pageX - start.current.x;
    const dy = nativeEvent.pageY - start.current.y;
    if (Math.abs(dy) >= SCROLL_START) return false;
    return open ? Math.abs(dx) >= SWIPE_START : dx <= -SWIPE_START;
  };

  const a11y: SwipeA11y = {
    accessibilityActions: actions.map((action) => ({ name: action.key, label: action.label })),
    onAccessibilityAction: (event) =>
      actions.find((action) => action.key === event.nativeEvent.actionName)?.onPress(),
  };

  return (
    <View onStartShouldSetResponderCapture={touchStarts} onMoveShouldSetResponderCapture={isSwipe}>
      {shown && (
        // Only reachable once open: until then they are half uncovered. They sit inside the row's
        // bounds, under it, so they are touchable on Android once it moved out of the way.
        <Animated.View
          testID={`actions ${testID}`}
          style={[styles.actions, { width, opacity: fade }]}
          accessibilityElementsHidden={!open}
          importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
        >
          {actions.map((action, index) => (
            <Animated.View
              key={action.key}
              style={{
                transform: reduce ? [] : [{ translateX: grow[index] }, { scale: progress }],
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={() => {
                  snap(false);
                  action.onPress();
                }}
                style={[styles.action, action.destructive && styles.destructive]}
              >
                <Icon
                  name={action.icon}
                  size={20}
                  color={action.destructive ? colors.textErr : colors.textPrimary}
                />
              </Pressable>
            </Animated.View>
          ))}
        </Animated.View>
      )}
      <GestureDetector gesture={swipe}>
        <Animated.View style={{ transform: [{ translateX: x }] }}>
          {children(a11y)}
          {shown && (
            <Animated.View
              testID={`tint ${testID}`}
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                styles.tint,
                { borderRadius: rowRadius, opacity: fade },
              ]}
            />
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ACTION_GAP,
    paddingHorizontal: ACTION_GAP,
  },
  action: {
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.bgRaised,
  },
  destructive: { backgroundColor: colors.bgErrSoftStrong },
  tint: { backgroundColor: colors.bgSwiped },
});
