import { useEffect, useLayoutEffect, useState } from 'react';
import { Animated } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';

import type { ReorderItemProps } from '@/presentation/features/routine-editor/use-reorder-list';
import { motion, reorderSpring } from '@/presentation/theme/motion';

interface DraggableItemOptions extends Omit<ReorderItemProps, 'onLayout'> {
  /** The axis it moves along. */
  axis: 'x' | 'y';
  /** The gesture id in tests. */
  testId: string;
  /** Milliseconds held before the drag starts; none: it starts on moving. */
  longPress?: number;
}

/**
 * The item side of dragging to reorder (#261): follows the finger along `axis`, looks raised
 * while held and springs to its place. When the order changes the new `base` takes it there.
 */
export function useDraggableItem({
  base,
  animate,
  onOffset,
  onDragStart,
  onDragMove,
  onDrop,
  onDragCancel,
  axis,
  testId,
  longPress,
}: DraggableItemOptions) {
  const [dragging, setDragging] = useState(false);
  // How raised the item looks (Figma «Dragging»): it fades in and out instead of switching.
  const [lift] = useState(() => new Animated.Value(0));
  const [offset] = useState(() => new Animated.Value(-base));
  useEffect(() => {
    onOffset(offset);
    return () => onOffset(null);
  }, [offset, onOffset]);

  const rest = -base;
  // Springs back to its place, raised until it is there. With «reduce motion» it lands at once.
  const settle = () => {
    if (!animate) {
      offset.setValue(rest);
      lift.setValue(0);
      setDragging(false);
      return;
    }
    Animated.timing(lift, { toValue: 0, duration: motion.state, useNativeDriver: true }).start();
    Animated.spring(offset, { toValue: rest, ...reorderSpring, useNativeDriver: true }).start(() =>
      setDragging(false),
    );
  };
  // A new place in the list: the dropped item comes from where the finger left it.
  useLayoutEffect(() => {
    if (!animate) {
      offset.setValue(-base);
      return;
    }
    Animated.spring(offset, { toValue: -base, ...reorderSpring, useNativeDriver: true }).start(() =>
      setDragging(false),
    );
  }, [base, animate, offset]);

  // On the JS thread: the drop needs the layouts and the ViewModel, and an item is light to move.
  let pan = Gesture.Pan().runOnJS(true).withTestId(testId);
  if (longPress !== undefined) pan = pan.activateAfterLongPress(longPress);
  pan = pan
    .onStart(() => {
      setDragging(true);
      if (animate) {
        Animated.timing(lift, {
          toValue: 1,
          duration: motion.press,
          useNativeDriver: true,
        }).start();
      } else {
        lift.setValue(1);
      }
      onDragStart();
    })
    .onUpdate((event) => {
      const translation = axis === 'x' ? event.translationX : event.translationY;
      offset.setValue(rest + translation);
      onDragMove(translation);
    })
    .onEnd((event) => {
      // When the order changed, the new `base` springs it to its place.
      if (!onDrop(axis === 'x' ? event.translationX : event.translationY)) return settle();
      Animated.timing(lift, {
        toValue: 0,
        duration: animate ? motion.state : 0,
        useNativeDriver: true,
      }).start();
      if (!animate) setDragging(false);
    })
    .onFinalize((_, success) => {
      if (success) return;
      onDragCancel();
      settle();
    });

  return { dragging, lift, offset, pan };
}
