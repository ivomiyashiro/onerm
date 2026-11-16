import { StyleSheet, View } from 'react-native';

import { Text } from '@/presentation/components/text';
import { home } from '@/presentation/strings/home';
import { colors, radius, space, typography } from '@/presentation/theme';

/** RF-ENT-01.AC8: «Esta semana · 2 de 3» and Monday to Sunday, the days done and today lit. */
export function Week({
  done,
  goal,
  doneDays,
  today,
}: {
  done: number;
  goal: number;
  doneDays: readonly number[];
  today: number;
}) {
  return (
    <View style={styles.week} accessible accessibilityLabel={home.weekName(done, goal)}>
      <View style={styles.weekTitle}>
        <Text style={[typography.label, { color: colors.textSecondary }]}>{home.thisWeek}</Text>
        <Text style={[typography.bodyMBold, { color: colors.textPrimary }]}>
          {home.weekProgress(done, goal)}
        </Text>
      </View>
      <View style={styles.weekDays}>
        {home.weekDayLetters.map((letter, index) => {
          const state = doneDays.includes(index) ? 'done' : index === today ? 'today' : 'pending';
          return (
            <View
              key={index}
              accessibilityLabel={home.weekDay(index, state)}
              style={[styles.weekDay, styles[state]]}
            >
              <Text
                style={[
                  typography.tab,
                  {
                    color:
                      state === 'done'
                        ? colors.textOnAccent
                        : state === 'today'
                          ? colors.textAccent
                          : colors.textSecondary,
                  },
                ]}
              >
                {letter}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  week: {
    gap: space.s12,
    padding: space.s16,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  weekTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekDays: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  done: { backgroundColor: colors.bgAccent },
  today: { borderWidth: 1.5, borderColor: colors.bgAccent },
  pending: { backgroundColor: colors.bgRaised },
});
