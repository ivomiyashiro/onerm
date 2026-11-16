import { Pressable, StyleSheet, View } from 'react-native';

import { CardPlate } from '@/presentation/components/button/card-plate';
import { ElapsedText } from '@/presentation/components/clock/elapsed-text';
import { Icon, type IconName } from '@/presentation/components/icons/icon';
import { Text } from '@/presentation/components/text';
import type { NextDayContent } from '@/presentation/features/home/next-day';
import { home } from '@/presentation/strings/home';
import { colors, fonts, radius, size, space, typography } from '@/presentation/theme';

/** RF-ENT-01.AC9: the day's size drops with its length; two lines at most, then «…». */
function dayStyle(name: string) {
  const length = Array.from(name).length;
  return length <= 6
    ? typography.displayHero
    : length <= 12
      ? typography.displayL
      : typography.displayM;
}

/**
 * The lime plate (marca §18): «Hoy toca» and «Cambiar día», the day big over its letter, the
 * routine, what it takes and «Empezar» («Continuar» with a workout in progress, RF-ENT-01.AC4).
 */
export function DayCard({
  nextDay,
  inProgressSince,
  onChangeDay,
  onStart,
}: {
  nextDay: NextDayContent;
  inProgressSince: Date | null;
  onChangeDay: () => void;
  onStart: () => void;
}) {
  const { routine, day, sets, minutes } = nextDay;
  const words = day.name.trim().split(/\s+/);
  const letter = Array.from(words[words.length - 1])[0]?.toUpperCase() ?? '';
  const facts: [IconName, string][] = [
    ['clock', home.minutes(minutes)],
    ['list', home.exercises(day.exercises.length)],
    ['dumbbell', home.sets(sets)],
  ];
  return (
    <View style={styles.card}>
      <CardPlate />
      <Text style={styles.letter} accessible={false} importantForAccessibility="no">
        {letter}
      </Text>
      <View style={styles.cardTop}>
        <View style={styles.chip}>
          {inProgressSince ? (
            // #229: only this line renders every second, not the card.
            <ElapsedText
              startedAt={inProgressSince}
              format={home.inProgressSince}
              style={[typography.label, { color: colors.textAccent }]}
            />
          ) : (
            <Text style={[typography.label, { color: colors.textAccent }]}>{home.todayIs}</Text>
          )}
        </View>
        <Pressable accessibilityRole="button" onPress={onChangeDay} style={styles.changeDay}>
          <Text style={[typography.bodyMBold, { color: colors.textOnAccent }]}>
            {home.changeDay}
          </Text>
          <Icon name="chevron" size={16} color={colors.textOnAccent} />
        </Pressable>
      </View>
      <Text
        style={[dayStyle(day.name), { color: colors.textOnAccent }]}
        numberOfLines={2}
        ellipsizeMode="tail"
        accessibilityRole="header"
      >
        {day.name}
      </Text>
      <Text style={[typography.bodyM, { color: colors.textOnAccent }]}>{routine.name}</Text>
      <View style={styles.facts}>
        {facts.map(([icon, label]) => (
          <View key={icon} style={styles.fact}>
            <Icon name={icon} size={16} color={colors.textOnAccent} />
            <Text style={[typography.tab, { color: colors.textOnAccent }]}>{label}</Text>
          </View>
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={onStart} style={styles.start}>
        <Text style={[typography.titleM, styles.startLabel]}>
          {inProgressSince ? home.continue : home.startDay(day.name)}
        </Text>
        <Icon name="arrow" size={20} color={colors.textAccent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.s8,
    padding: 18,
    // The primary button's plate (#225): its radius and cut corners, at card size.
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  // The day's letter, huge and tone on tone (marca §18).
  letter: {
    position: 'absolute',
    right: -24,
    bottom: -40,
    fontFamily: fonts.display,
    fontSize: 280,
    lineHeight: 280,
    color: colors.textOnAccent,
    opacity: 0.08,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: {
    paddingVertical: space.s6,
    paddingHorizontal: space.s12,
    borderRadius: radius.full,
    backgroundColor: colors.bgBase,
  },
  changeDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: size.targetMin,
    paddingLeft: space.s8,
  },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s16, paddingTop: space.s4 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: space.s6 },
  start: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s10,
    minHeight: size.targetMain,
    marginTop: space.s8,
    borderRadius: 16,
    backgroundColor: colors.bgBase,
  },
  startLabel: { color: colors.textAccent, textTransform: 'uppercase' },
});
