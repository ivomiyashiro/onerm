import { useState, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type AccessibilityActionInfo,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { Icon, type IconName } from '@/presentation/components/icons/icon';
import { Text } from '@/presentation/components/text';
import { colors, radius, space, typography } from '@/presentation/theme';

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

/** Each action's width, a 48 dp target and its label (RNF-16). */
const ACTION_WIDTH = 76;
/** #251: the space before each action, so they read as buttons apart from the row. */
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
 */
export function SwipeRow({
  actions,
  testID,
  borderRadius = radius.lg,
  children,
}: {
  actions: SwipeAction[];
  /** The gesture is `swipe {testID}` in tests. */
  testID: string;
  /** The row's corners, so the actions take them. */
  borderRadius?: number;
  children: (a11y: SwipeA11y) => ReactNode;
}) {
  const width = actions.length * (ACTION_GAP + ACTION_WIDTH);
  const [x] = useState(() => new Animated.Value(0));
  const [open, setOpen] = useState(false);
  // Drawn from the first move, so the swipe uncovers them; gone again once it closed.
  const [shown, setShown] = useState(false);

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

  const a11y: SwipeA11y = {
    accessibilityActions: actions.map((action) => ({ name: action.key, label: action.label })),
    onAccessibilityAction: (event) =>
      actions.find((action) => action.key === event.nativeEvent.actionName)?.onPress(),
  };

  return (
    <View>
      {shown && (
        // Only reachable once open: until then they are half uncovered. They move with the row, from
        // just past its right edge, so they are inside the row (and touchable on Android) once open.
        <Animated.View
          style={[styles.actions, { width, transform: [{ translateX: Animated.add(x, width) }] }]}
          accessibilityElementsHidden={!open}
          importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
        >
          {actions.map((action) => (
            <Pressable
              key={action.key}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={() => {
                snap(false);
                action.onPress();
              }}
              style={[styles.action, { borderRadius }, action.destructive && styles.destructive]}
            >
              <Icon
                name={action.icon}
                size={20}
                color={action.destructive ? colors.textErr : colors.textPrimary}
              />
              <Text
                style={[
                  typography.bodyS,
                  { color: action.destructive ? colors.textErr : colors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </Animated.View>
      )}
      <GestureDetector gesture={swipe}>
        <Animated.View style={{ transform: [{ translateX: x }] }}>{children(a11y)}</Animated.View>
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
    gap: ACTION_GAP,
    paddingLeft: ACTION_GAP,
  },
  action: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.bgRaised,
  },
  destructive: { backgroundColor: colors.bgErrSoftStrong },
});
