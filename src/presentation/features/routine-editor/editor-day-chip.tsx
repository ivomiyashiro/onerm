import { Animated, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { Chip } from '@/presentation/components/chip/chip';
import { useDraggableItem } from '@/presentation/features/routine-editor/use-draggable-item';
import type { ReorderItemProps } from '@/presentation/features/routine-editor/use-reorder-list';
import { routines as text } from '@/presentation/strings/routines';
import { colors, elevation, radius, space } from '@/presentation/theme';

/** Holding a day this long lifts it, so a tap or a scroll of the days doesn't (#271). */
const HOLD_MS = 300;

interface EditorDayChipProps extends ReorderItemProps {
  name: string;
  selected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onPress: () => void;
  /** «Mover antes» and «Mover después» for screen readers (RF-RUT-05.AC3); touch drags. */
  onMove: (offset: -1 | 1) => void;
}

/**
 * A day of S15 that moves by holding it and dragging sideways: the same movement as the exercise
 * rows (#261), along the X axis. The list measures along `y`/`height`, so the chip reports its
 * `x` and its width plus the gap to the next one.
 */
export function EditorDayChip({
  name,
  selected,
  isFirst,
  isLast,
  onPress,
  onMove,
  onLayout,
  ...reorder
}: EditorDayChipProps) {
  const { dragging, lift, offset, pan } = useDraggableItem({
    ...reorder,
    axis: 'x',
    testId: `drag day ${name}`,
    longPress: HOLD_MS,
  });
  const moves = [
    ...(isFirst ? [] : [{ name: 'moveBefore', label: text.editor.day.moveBefore }]),
    ...(isLast ? [] : [{ name: 'moveAfter', label: text.editor.day.moveAfter }]),
  ];

  return (
    <View
      testID={`day ${name}`}
      onLayout={({ nativeEvent: { layout } }) =>
        onLayout({ y: layout.x, height: layout.width + space.s8 })
      }
      style={[dragging && styles.dragging, { transform: [{ translateX: reorder.base }] }]}
    >
      <Animated.View style={{ transform: [{ translateX: offset }] }}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.lifted, { opacity: lift }]}
        />
        <GestureDetector gesture={pan}>
          <View>
            <Chip
              label={name}
              selected={selected}
              onPress={onPress}
              accessibilityActions={moves}
              onAccessibilityAction={(event) =>
                onMove(event.nativeEvent.actionName === 'moveBefore' ? -1 : 1)
              }
            />
          </View>
        </GestureDetector>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  dragging: { zIndex: 1 },
  lifted: { borderRadius: radius.full, backgroundColor: colors.bgRaised, ...elevation.toast },
});
