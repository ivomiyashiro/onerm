import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Recommendation } from '@/domain/usecases/observe-recommendation';
import { Badge } from '@/presentation/components/badge/badge';
import { Button } from '@/presentation/components/button/button';
import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { Notice } from '@/presentation/components/feedback/notice';
import { VeiledPhoto, type Veil } from '@/presentation/components/photo/veiled-photo';
import { Text } from '@/presentation/components/text';
import {
  useRecommendationViewModel,
  type RecommendationExit,
} from '@/presentation/features/onboarding/use-recommendation-view-model';
import { TemplateWhySheet } from '@/presentation/features/routines/template-why-sheet';
import { onboarding } from '@/presentation/strings/onboarding';
import { routines } from '@/presentation/strings/routines';
import { colors, space, typography } from '@/presentation/theme';

interface RecommendationScreenProps {
  /** Runs once the onboarding is done and the tabs exist (08 §3). */
  onDone: (exit: RecommendationExit) => void;
}

/**
 * Figma S06 «Velo» stretched to the whole card: the photo (portrait) fills it, so the plates show
 * above the name and the text stays over ≥ 65 % of the background (marca §9).
 */
const VEIL: Veil = [
  { offset: 0, opacity: 0.15 },
  { offset: 0.35, opacity: 0.65 },
  { offset: 0.65, opacity: 0.9 },
  { offset: 1, opacity: 0.97 },
];

const NOTES = {
  threeDaysAreEnough: onboarding.recommendation.noviceManyDays,
  fourDayTemplate: onboarding.recommendation.intermediateManyDays,
} as const;

/** S06 · Recomendación de plantilla (RF-PERF-02). */
export function RecommendationScreen({ onDone }: RecommendationScreenProps) {
  const { state, actions } = useRecommendationViewModel(onDone);
  const [whyOpen, setWhyOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const content = state.status === 'content' ? state.recommendation : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {content && <Content recommendation={content} onWhy={() => setWhyOpen(true)} />}
        {state.status === 'error' && (
          <EmptyState
            icon="alert"
            title={routines.list.readError.title}
            body={routines.list.readError.body}
            action={{ label: routines.list.readError.retry, onPress: actions.retry }}
          />
        )}
      </ScrollView>
      <View style={styles.actions}>
        {content && (
          <Button
            variant="primary"
            size="xl"
            label={onboarding.recommendation.start}
            onPress={actions.start}
          />
        )}
        <Button
          variant="secondary"
          label={onboarding.recommendation.seeOthers}
          onPress={actions.seeOthers}
        />
        <Button
          variant="tertiary"
          label={onboarding.recommendation.notNow}
          onPress={actions.notNow}
        />
      </View>
      {content && (
        <TemplateWhySheet
          template={content.template}
          visible={whyOpen}
          onClose={() => setWhyOpen(false)}
        />
      )}
    </View>
  );
}

function Content({ recommendation, onWhy }: { recommendation: Recommendation; onWhy: () => void }) {
  const { template, minutes, goal, note } = recommendation;
  const summaries: Record<string, string> = routines.template.summary;
  const summary = summaries[template.id];
  return (
    <>
      <Text style={[typography.label, styles.label]}>{onboarding.recommendation.title}</Text>
      <View style={styles.card}>
        <VeiledPhoto photo="rack" veil={VEIL} />
        {/* The padding goes inside: the photo fills the card from its edge. */}
        <View style={styles.cardContent}>
          <Text style={[typography.displaySm, styles.name]} accessibilityRole="header">
            {template.name}
          </Text>
          <View style={styles.badges}>
            <Badge label={routines.list.days(template.daysPerWeek)} />
            <Badge label={routines.list.minutes(minutes)} />
            <Badge label={onboarding.recommendation.equipment} />
          </View>
        </View>
      </View>
      {summary !== undefined && (
        <Text style={[typography.bodyL, { color: colors.textSecondary }]}>{summary}</Text>
      )}
      <View style={styles.why}>
        <Button variant="tertiary" label={onboarding.recommendation.why} onPress={onWhy} />
      </View>
      {note !== null && <Notice message={NOTES[note]} />}
      {goal === 'strength' && <Notice message={routines.template.strengthWarning} />}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  content: { gap: space.s14, paddingTop: space.s12, paddingHorizontal: space.s16 },
  label: { paddingLeft: space.s4, color: colors.textSecondary },
  card: {
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  cardContent: { gap: space.s10, paddingTop: 110, paddingBottom: 18, paddingHorizontal: 18 },
  name: { color: colors.textPrimary, textTransform: 'uppercase' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s6 },
  why: { flexDirection: 'row' },
  actions: { gap: space.s8, paddingTop: space.s12, paddingHorizontal: space.s16 },
});
