import { useRef, useState } from 'react';
import { Animated } from 'react-native';

import type { Id } from '@/domain/models/vocabulary';
import {
  dropDistance,
  dropIndex,
  rowShift,
  type RowLayout,
} from '@/presentation/features/routine-editor/drop-index';
import { reorderSpring } from '@/presentation/theme/motion';

/** What a draggable item (`useDraggableItem`) gets from its list. */
export interface ReorderItemProps {
  base: number;
  animate: boolean;
  onOffset: (offset: Animated.Value | null) => void;
  onLayout: (layout: RowLayout) => void;
  onDragStart: () => void;
  onDragMove: (translationY: number) => void;
  onDrop: (translationY: number) => boolean;
  onDragCancel: () => void;
}

/**
 * The list side of dragging to reorder (RF-RUT-05.AC1, #261): the items the dragged one passes
 * make room for it, and on a drop each item keeps where it is drawn while the new order commits,
 * so nothing jumps. Works along either axis: the layouts say `y`/`height` for the main one.
 */
export function useReorderList(
  ids: readonly Id[],
  animate: boolean,
  onMoveTo: (id: Id, index: number) => void,
) {
  // Measured by each item, read only when one is dropped.
  const layouts = useRef<RowLayout[]>([]);
  // Each item's animated offset, and how far it is drawn from its place (see the item's `base`).
  const offsets = useRef(new Map<Id, Animated.Value>());
  const [bases, setBases] = useState<Readonly<Record<Id, number>>>({});
  const baseOf = (id: Id) => bases[id] ?? 0;
  // The dragged item (-1: none), its size and where it would land.
  const drag = useRef({ from: -1, height: 0, to: -1 });

  const landing = (from: number, translation: number) =>
    dropIndex(layouts.current.slice(0, ids.length), from, translation);
  // The items the dragged one passes make room for it; the others go back to their places.
  const shiftOthers = (to: number) => {
    const { from, height } = drag.current;
    if (from < 0) return;
    ids.forEach((id, index) => {
      const offset = offsets.current.get(id);
      if (index === from || !offset) return;
      Animated.spring(offset, {
        toValue: -baseOf(id) + rowShift(index, from, to, height),
        ...reorderSpring,
        useNativeDriver: true,
      }).start();
    });
  };

  const propsFor = (id: Id, index: number): ReorderItemProps => ({
    base: baseOf(id),
    animate,
    onOffset: (offset) => (offset ? offsets.current.set(id, offset) : offsets.current.delete(id)),
    onLayout: (layout) => {
      layouts.current[index] = layout;
    },
    onDragStart: () => {
      drag.current = { from: index, height: layouts.current[index]?.height ?? 0, to: index };
    },
    onDragMove: (translation) => {
      const to = landing(index, translation);
      if (!animate || to === drag.current.to) return;
      drag.current.to = to;
      shiftOthers(to);
    },
    onDrop: (translation) => {
      const to = landing(index, translation);
      if (to === index) {
        if (animate) shiftOthers(index);
        drag.current.from = -1;
        return false;
      }
      // Each item keeps where it is drawn: the new order and the bases commit together.
      const changes: Record<Id, number> = {
        [id]: baseOf(id) - dropDistance(layouts.current, index, to),
      };
      if (animate) {
        ids.forEach((other, at) => {
          const shift = rowShift(at, index, to, drag.current.height);
          const offset = offsets.current.get(other);
          if (shift === 0 || !offset) return;
          offset.stopAnimation();
          offset.setValue(-baseOf(other) + shift);
          changes[other] = baseOf(other) - shift;
        });
      }
      drag.current.from = -1;
      setBases((current) => ({ ...current, ...changes }));
      onMoveTo(id, to);
      return true;
    },
    onDragCancel: () => {
      // Also called for a touch on the handle that never became a drag.
      if (animate) shiftOthers(index);
      drag.current.from = -1;
    },
  });

  return propsFor;
}
