import { useEffect } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ExperienceLevel, TrainingGoal } from '@/domain/models/vocabulary';
import { Button } from '@/presentation/components/button/button';
import { NumberSegments } from '@/presentation/components/choice/number-segments';
import { OptionCard } from '@/presentation/components/choice/option-card';
import { StepProgress } from '@/presentation/components/choice/step-progress';
import { Icon } from '@/presentation/components/icons/icon';
import { Text } from '@/presentation/components/text';
import {
  QUESTIONS,
  useOnboardingViewModel,
  type OnboardingViewModel,
} from '@/presentation/features/onboarding/use-onboarding-view-model';
import { onboarding } from '@/presentation/strings/onboarding';
import { colors, size, space, typography } from '@/presentation/theme';

const LEVELS: readonly ExperienceLevel[] = ['novice', 'intermediate', 'advanced'];
const GOALS: readonly TrainingGoal[] = ['health', 'hypertrophy', 'strength'];
/** RF-PERF-03.AC3: 2 to 6 days. */
const DAYS = [2, 3, 4, 5, 6];

/** S05 · Onboarding (RF-PERF-01): three questions, one per step. */
export function OnboardingScreen() {
  const { state, actions } = useOnboardingViewModel();
  const insets = useSafeAreaInsets();
  const step = state.status === 'content' ? state.step : null;

  // Android's back goes to the previous question, like «Atrás»; on the first one it leaves the app.
  useEffect(() => {
    if (step === null || step === QUESTIONS[0]) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      actions.back();
      return true;
    });
    return () => subscription.remove();
  }, [step, actions]);

  if (state.status === 'loading') return <View style={styles.screen} />;

  const { answers } = state;
  const number = QUESTIONS.indexOf(state.step) + 1;
  const isLast = number === QUESTIONS.length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        <View style={styles.back}>
          {number > 1 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={onboarding.back}
              onPress={actions.back}
              style={styles.back}
            >
              <Icon name="back" size={20} color={colors.textPrimary} />
            </Pressable>
          )}
        </View>
        <StepProgress current={number} total={QUESTIONS.length} />
        <Button variant="tertiary" label={onboarding.skip} onPress={actions.skip} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.question}>
          <Text style={[typography.label, { color: colors.textSecondary }]}>
            {onboarding.stepOf(number)}
          </Text>
          <Text
            style={[typography.titleXl, { color: colors.textPrimary }]}
            accessibilityRole="header"
          >
            {onboarding[state.step].question}
          </Text>
        </View>
        <Answers step={state.step} answers={answers} select={actions.select} />
      </ScrollView>
      <View style={styles.action}>
        <Button
          variant="primary"
          size="xl"
          label={isLast ? onboarding.seeMyRoutine : onboarding.next}
          icon="arrow"
          onPress={actions.next}
        />
      </View>
    </View>
  );
}

type Content = Extract<OnboardingViewModel['state'], { status: 'content' }>;

function Answers({
  step,
  answers,
  select,
}: Pick<Content, 'step' | 'answers'> & Pick<OnboardingViewModel['actions'], 'select'>) {
  switch (step) {
    case 'level':
      return LEVELS.map((level) => (
        <OptionCard
          key={level}
          {...onboarding.level[level]}
          selected={answers.level === level}
          onPress={() => select({ level })}
        />
      ));
    case 'goal':
      return GOALS.map((goal) => (
        <OptionCard
          key={goal}
          {...onboarding.goal[goal]}
          selected={answers.goal === goal}
          onPress={() => select({ goal })}
        />
      ));
    case 'days':
      return (
        <>
          <NumberSegments
            values={DAYS}
            selected={answers.daysPerWeek}
            onSelect={(daysPerWeek) => select({ daysPerWeek })}
            label={onboarding.days.question}
          />
          <Text style={[typography.bodyM, { color: colors.textSecondary }]}>
            {onboarding.days.help}
          </Text>
        </>
      );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s8,
    minHeight: 56,
    paddingLeft: 4,
    paddingRight: space.s8,
  },
  back: {
    width: size.targetMin,
    height: size.targetMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { gap: space.s12, paddingTop: space.s16, paddingHorizontal: space.s16 },
  question: { gap: space.s8, paddingBottom: space.s8, paddingHorizontal: 4 },
  action: { paddingTop: space.s12, paddingHorizontal: space.s16 },
});
