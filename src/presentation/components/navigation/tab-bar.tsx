import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Icon, type IconName } from '@/presentation/components/icons/icon';
import { colors, size, typography } from '@/presentation/theme';
import { Text } from '@/presentation/components/text';

export interface TabItem {
  key: string;
  label: string;
  icon: IconName;
}

/** Figma «TabBar» → Acción: the central button (marca §15). */
export interface TabAction {
  kind: 'start' | 'continue' | 'disabled';
  label: string;
  /** What TalkBack reads (13 §10): «Empezar Día A», «Continuar entrenamiento, 18:42». */
  accessibilityLabel: string;
  /** «Continuar» shows the time of the workout in progress. */
  time?: string;
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
        style={styles.tab}
      >
        <View style={styles.pill}>
          {active && <View testID="tab-pill" style={styles.pillActive} />}
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.accessibilityLabel}
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
      {action.time ? (
        <>
          <Icon name="dumbbell" size={22} color={ink} />
          {/* The disc is 64 dp: past an hour («1:08:23») the time goes one size down, and it
              doesn't grow with the system font (TalkBack reads it in the button's name). */}
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1}
            style={[
              action.time.length > SHORT_TIME.length ? typography.monoXs : typography.monoS,
              { color: ink },
            ]}
          >
            {action.time}
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
    overflow: 'hidden',
    boxShadow: '0px 6px 16px 0px rgba(0, 0, 0, 0.45)',
  },
  discDisabled: { backgroundColor: colors.bgRaised, boxShadow: undefined },
  discFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  // Its own view, mounted when the tab turns active: on Android (Fabric) a background added
  // later to a view with a border radius showed up square.
  pillActive: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 16,
    backgroundColor: colors.bgRaised,
  },
});
