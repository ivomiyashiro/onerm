import { useLayoutEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useElapsed } from '@/presentation/components/clock/use-elapsed';
import { useReduceMotion } from '@/presentation/components/feedback/use-reduce-motion';
import { Icon, type IconName } from '@/presentation/components/icons/icon';
import { colors, size, typography } from '@/presentation/theme';
import { Text } from '@/presentation/components/text';
import { spring } from '@/presentation/theme/motion';

export interface TabItem {
  key: string;
  label: string;
  icon: IconName;
}

/** Figma «TabBar» → Acción: the central button (marca §15). */
export interface TabAction {
  kind: 'start' | 'continue' | 'disabled';
  label: string;
  /** What TalkBack reads (13 §10), with the running time: «Continuar entrenamiento, 18:42». */
  accessibilityLabel: (time: string | null) => string;
  /**
   * «Continuar» shows the time since the workout started. The disc runs that clock itself, so
   * only it renders every second, not the tabs (#229).
   */
  startedAt?: Date;
  onPress: () => void;
}

interface TabBarProps {
  tabs: TabItem[];
  /** Goes in the middle: half of the tabs on each side. */
  action?: TabAction;
  activeKey: string;
  onSelect: (key: string) => void;
  /** Bottom safe area, so the tabs stay above the system navigation. */
  bottomInset?: number;
}

/**
 * Figma «TabBar»: the active tab gets a grey pill and light text, never lime (marca §7).
 * The Figma background blur is left out: it needs a native view; the 90 % background stays.
 */
export function TabBar({ tabs, action, activeKey, onSelect, bottomInset = 0 }: TabBarProps) {
  const half = Math.ceil(tabs.length / 2);
  // Where each tab and its pill are, once laid out: the one pill slides between them (#248 M4).
  const [tabX, setTabX] = useState<Record<string, number>>({});
  const [pillY, setPillY] = useState<number | null>(null);
  const [pillX, setPillX] = useState(0);
  const pill = useSlidingPill(tabX[activeKey]);
  const renderTab = (tab: TabItem) => {
    const active = tab.key === activeKey;
    const color = active ? colors.textPrimary : colors.textSecondary;
    return (
      <Pressable
        key={tab.key}
        accessibilityRole="tab"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected: active }}
        onPress={() => onSelect(tab.key)}
        onLayout={(event) => {
          const { x } = event.nativeEvent.layout;
          setTabX((all) => (all[tab.key] === x ? all : { ...all, [tab.key]: x }));
        }}
        style={styles.tab}
      >
        <View
          style={styles.pill}
          onLayout={(event) => {
            const { x, y } = event.nativeEvent.layout;
            setPillY(y);
            setPillX(x);
          }}
        >
          <Icon name={tab.icon} size={21} color={color} />
        </View>
        <Text {...BAR_TEXT} style={[typography.tab, { color }]}>
          {tab.label}
        </Text>
      </Pressable>
    );
  };
  const bar = (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: Math.max(bottomInset, 8) }]}
    >
      {/* First, so it goes behind the icons. */}
      {pill.at !== null && pillY !== null && (
        <Animated.View
          testID="tab-pill"
          pointerEvents="none"
          style={[
            styles.pillActive,
            {
              top: pillY + styles.bar.paddingTop,
              left: pillX,
              transform: [{ translateX: pill.at }, { scaleX: pill.stretch }],
            },
          ]}
        />
      )}
      {tabs.slice(0, half).map(renderTab)}
      {action && <ActionLabel action={action} />}
      {tabs.slice(half).map(renderTab)}
    </View>
  );
  if (!action) return bar;
  // Android only delivers a touch inside the bounds of every ancestor: the disc rises over the
  // bar, so it lives in a taller transparent box that lets the touches around it through.
  return (
    <View pointerEvents="box-none" style={styles.rise}>
      {bar}
      <ActionDisc action={action} />
    </View>
  );
}

/**
 * #248 M4: the pill of the active tab slides to the new one with a spring, stretching a bit on
 * the way. It appears in place the first time, and moves at once with «reduce motion».
 */
function useSlidingPill(x: number | undefined) {
  const reduce = useReduceMotion();
  const [at] = useState(() => new Animated.Value(0));
  const [stretch] = useState(() => new Animated.Value(1));
  const placed = useRef(false);

  useLayoutEffect(() => {
    if (x === undefined) return;
    if (!placed.current || reduce) {
      placed.current = true;
      at.setValue(x);
      return;
    }
    const animation = Animated.parallel([
      Animated.spring(at, { toValue: x, ...spring, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(stretch, {
          toValue: 1.18,
          duration: 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(stretch, {
          toValue: 1,
          duration: 250,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);
    animation.start();
    return () => {
      animation.stop();
      stretch.setValue(1);
    };
  }, [x, reduce, at, stretch]);

  return { at: x === undefined ? null : at, stretch };
}

/**
 * The bar has a fixed height: with the system font at 150 % «Continuar» and «Progreso» broke in
 * two lines and the disc cut the time (RNF-18). Its texts grow up to 1.2× and stay in one line;
 * TalkBack still reads them whole.
 */
const BAR_TEXT = { numberOfLines: 1, maxFontSizeMultiplier: 1.2 } as const;

/** «18:42» fits the disc in monoS; «1:08:23» needs one size down. */
const SHORT_TIME = '00:00';

/** The label under the disc, also pressable; the disc carries the accessibility. */
function ActionLabel({ action }: { action: TabAction }) {
  const disabled = action.kind === 'disabled';
  return (
    <Pressable
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      disabled={disabled}
      onPress={action.onPress}
      style={styles.tab}
    >
      <View style={styles.pill} />
      <Text
        {...BAR_TEXT}
        style={[typography.tab, { color: disabled ? colors.textTertiary : colors.textPrimary }]}
      >
        {action.label}
      </Text>
    </Pressable>
  );
}

/** A 64 dp lime disc that rises over the bar; grey and inert when disabled. */
function ActionDisc({ action }: { action: TabAction }) {
  const disabled = action.kind === 'disabled';
  const ink = disabled ? colors.textTertiary : colors.textOnAccent;
  const time = useElapsed(action.startedAt ?? null);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.accessibilityLabel(time)}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={action.onPress}
      style={[styles.disc, disabled && styles.discDisabled]}
    >
      {!disabled && (
        <View style={styles.discFill} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="action" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.bgAccentTop} />
                <Stop offset="1" stopColor={colors.bgAccentBottom} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#action)" />
          </Svg>
        </View>
      )}
      {time ? (
        <>
          <Icon name="dumbbell" size={22} color={ink} />
          {/* The disc is 64 dp: past an hour («1:08:23») the time goes one size down, and it
              doesn't grow with the system font (TalkBack reads it in the button's name). */}
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1}
            style={[
              time.length > SHORT_TIME.length ? typography.monoXs : typography.monoS,
              { color: ink },
            ]}
          >
            {time}
          </Text>
        </>
      ) : (
        <Icon name="dumbbell" size={30} color={ink} />
      )}
    </Pressable>
  );
}

/** Figma «TabBar» → Botón: 64 px, 24 px over the bar (marca §15). */
const DISC = 64;
const RISE = 24;

const styles = StyleSheet.create({
  bar: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderHair,
    backgroundColor: colors.bgTabbar,
  },
  tab: {
    flex: 1,
    minHeight: size.targetMain,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pill: {
    width: 58,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rise: { marginTop: -RISE, paddingTop: RISE, alignItems: 'center' },
  disc: {
    position: 'absolute',
    top: 0,
    width: DISC,
    height: DISC,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DISC / 2,
    borderWidth: 5,
    borderColor: colors.bgTabbar,
    // Not clipped: on iOS `overflow: hidden` cut its shadow (#194); the fill rounds itself.
    boxShadow: '0px 6px 16px 0px rgba(0, 0, 0, 0.45)',
  },
  discDisabled: { backgroundColor: colors.bgRaised, boxShadow: undefined },
  discFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: DISC / 2,
    overflow: 'hidden',
  },
  // One view that moves, with its background from the start: on Android (Fabric) a background
  // added later to a view with a border radius showed up square.
  pillActive: {
    position: 'absolute',
    width: 58,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgRaised,
  },
});
