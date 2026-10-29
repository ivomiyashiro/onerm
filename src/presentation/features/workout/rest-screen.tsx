import { useState } from 'react';
import { Animated, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { EffortMode } from '@/domain/models/vocabulary';
import type { WorkoutSet } from '@/domain/models/workout';
import { Button } from '@/presentation/components/button/button';
import { useCountdown } from '@/presentation/components/clock/use-countdown';
import { Icon } from '@/presentation/components/icons/icon';
import { Overlay, useOverlayProgress } from '@/presentation/components/overlay/overlay-host';
import { Text } from '@/presentation/components/text';
import { RestRing } from '@/presentation/features/workout/rest-ring';
import type { RestView } from '@/presentation/features/workout/rest-view';
import { SetEffort } from '@/presentation/features/workout/set-effort';
import type { RirField } from '@/presentation/features/workout/set-form';
import { countdown, elapsed } from '@/presentation/strings/numbers';
import { workout as text } from '@/presentation/strings/workout';
import { colors, radius, space, typography } from '@/presentation/theme';

/** #196: how far down the rest is pulled to minimize it, or how fast (pt/s). */
const PULL_DISTANCE = 120;
const PULL_VELOCITY = 800;
/** The pull starts after this much down, and gives way to a sideways swipe. */
const PULL_START = 12;

interface RestScreenProps {
  rest: RestView;
  visible: boolean;
  effortMode: EffortMode;
  onAdd: () => void;
  onRestart: () => void;
  /** «Saltear descanso». */
  onSkip: () => void;
  onMinimize: () => void;
  onEffort: (set: WorkoutSet, field: RirField, rir: number) => void;
}

/**
 * S09 descanso a pantalla completa (08 §5, marca §13; Figma «Descanso (pantalla completa)»): the countdown with its ring, +15 s and Reiniciar, the set just done (with its
 * effort only while a calibration set waits for it), what comes next and «Saltear descanso». The «X», Back and pulling it down minimize it.
 */
export function RestScreen({ visible, ...props }: RestScreenProps) {
  return (
    <Overlay visible={visible} onRequestClose={props.onMinimize}>
      <RestPanel {...props} />
    </Overlay>
  );
}

function RestPanel({
  rest,
  effortMode,
  onAdd,
  onRestart,
  onSkip,
  onMinimize,
  onEffort,
}: Omit<RestScreenProps, 'visible'>) {
  // Its own countdown, once per second (#229): the workout behind it doesn't render.
  const remainingMs = useCountdown(rest.endsAt) ?? 0;
  const insets = useSafeAreaInsets();
  // It comes up over the workout, and goes down when minimized.
  const progress = useOverlayProgress();
  const { height } = useWindowDimensions();
  const entry = progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
  // #196: it follows the finger down, and minimizes when pulled far or fast enough.
  const [pulled] = useState(() => new Animated.Value(0));
  const translateY = Animated.add(entry, pulled);
  const pullDown = Gesture.Pan()
    .runOnJS(true)
    .withTestId('pull down rest')
    .activeOffsetY(PULL_START)
    .failOffsetX([-PULL_START, PULL_START])
    .onUpdate(({ translationY }) => pulled.setValue(Math.max(0, translationY)))
    .onEnd(({ translationY, velocityY }) => {
      if (translationY > PULL_DISTANCE || velocityY > PULL_VELOCITY) onMinimize();
      else Animated.spring(pulled, { toValue: 0, useNativeDriver: true }).start();
    });

  return (
    <GestureDetector gesture={pullDown}>
      <Animated.View
        style={[
          styles.screen,
          { paddingTop: insets.top, paddingBottom: insets.bottom, transform: [{ translateY }] },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text
              style={[typography.titleL, { color: colors.textPrimary }]}
              accessibilityRole="header"
            >
              {text.rest.title}
            </Text>
            <Text style={[typography.bodyS, { color: colors.textSecondary }]} numberOfLines={1}>
              {rest.exerciseName}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={text.rest.minimize}
            onPress={onMinimize}
            style={styles.iconButton}
          >
            <Icon name="x" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>
        <View style={styles.center}>
          <RestRing size={264} strokeWidth={10} progress={remainingMs / (rest.totalSeconds * 1000)}>
            <Text style={[typography.monoHero, { color: colors.textPrimary }]}>
              {countdown(remainingMs)}
            </Text>
            <Text style={[typography.bodyM, { color: colors.textSecondary }]}>
              {text.rest.ofTotal(elapsed(rest.totalSeconds * 1000))}
            </Text>
          </RestRing>
          <View style={styles.chips}>
            <Chip label={text.rest.plus15} onPress={onAdd} />
            <Chip label={text.rest.restart} onPress={onRestart} />
          </View>
          <View style={[styles.card, rest.awaitingEffort && styles.cardAsking]}>
            <View style={styles.summary}>
              <Icon name="check" size={20} color={colors.textOk} />
              <Text style={[typography.bodyMBold, { color: colors.textPrimary }]}>
                {rest.setText}
              </Text>
            </View>
            {rest.awaitingEffort && (
              <>
                <SetEffort set={rest.set} effortMode={effortMode} onEffort={onEffort} />
                <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
                  {text.calibration.answerToContinue(rest.setNumber + 1)}
                </Text>
              </>
            )}
            {rest.calibrationNote && (
              <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
                {rest.calibrationNote}
              </Text>
            )}
          </View>
          <Text style={[typography.bodyM, styles.next]}>{rest.nextText}</Text>
        </View>
        <View style={styles.bottom}>
          <Button variant="secondary" size="xl" label={text.rest.skipRest} onPress={onSkip} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

/** Figma «Chip +15 s» and «Chip Reiniciar». */
export function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.chip}>
      <Text style={[typography.bodyMBold, { color: colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.bgBase,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 48,
    paddingLeft: space.s20,
    paddingRight: space.s8,
  },
  flex: { flex: 1 },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s20,
    paddingHorizontal: space.s16,
  },
  chips: { flexDirection: 'row', gap: space.s10 },
  chip: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: space.s14,
    borderRadius: radius.md,
    backgroundColor: colors.bgRaised,
  },
  card: {
    alignSelf: 'stretch',
    gap: space.s12,
    paddingVertical: space.s14,
    paddingHorizontal: space.s16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  cardAsking: { borderColor: colors.borderAccentSoft, backgroundColor: colors.bgCurrent },
  summary: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  next: { color: colors.textSecondary, textAlign: 'center' },
  bottom: { paddingTop: space.s8, paddingBottom: space.s12, paddingHorizontal: space.s16 },
});
