import { StyleSheet, View } from 'react-native';

import type { RoutineTemplate } from '@/domain/models/routine-template';
import type { Id } from '@/domain/models/vocabulary';
import { Button } from '@/presentation/components/button/button';
import { Icon } from '@/presentation/components/icons/icon';
import { BottomSheet } from '@/presentation/components/overlay/bottom-sheet';
import { Text } from '@/presentation/components/text';
import { common } from '@/presentation/strings/common';
import { routines as text } from '@/presentation/strings/routines';
import { colors, radius, space, typography } from '@/presentation/theme';

interface TemplateWhySheetProps {
  template: Pick<RoutineTemplate, 'id' | 'rationale'>;
  visible: boolean;
  onClose: () => void;
}

/** «¿Por qué esta rutina?» (S06, S14): the paragraph of 13 §5 and its criteria with sources. */
export function TemplateWhySheet({ template, visible, onClose }: TemplateWhySheetProps) {
  return (
    <BottomSheet
      visible={visible}
      title={text.template.why}
      closeLabel={common.close}
      onClose={onClose}
      footer={<Button variant="secondary" label={common.understood} onPress={onClose} />}
    >
      <View style={styles.content}>
        <Text style={[typography.bodyL, { color: colors.textPrimary }]}>
          {rationaleOf(template)}
        </Text>
        <Criteria templateId={template.id} />
      </View>
    </BottomSheet>
  );
}

/** 13 §5, by template id; a template the texts don't know yet shows the catalog's text. */
function rationaleOf({ id, rationale }: TemplateWhySheetProps['template']): string {
  const texts: Record<string, string> = text.template.rationale;
  return texts[id] ?? rationale;
}

/** RF-RUT-01.AC3: each criterion with its sources (13 §5); none for a template the texts lack. */
function Criteria({ templateId }: { templateId: Id }) {
  const all: Record<string, readonly { title: string; sources: string }[]> = text.template.criteria;
  const criteria = all[templateId] ?? [];
  if (criteria.length === 0) return null;
  return (
    <View style={styles.criteria}>
      {criteria.map(({ title, sources }, index) => (
        <View key={title} style={[styles.criterion, index > 0 && styles.divider]}>
          <Icon name="check" size={18} color={colors.textAccent} />
          <View style={styles.criterionText}>
            <Text style={[typography.bodyMStrong, { color: colors.textPrimary }]}>{title}</Text>
            <Text style={[typography.bodyS, { color: colors.textSecondary }]}>{sources}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.s14, paddingBottom: space.s16 },
  criteria: { overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.bgRaised },
  criterion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.s12,
    paddingHorizontal: space.s14,
    paddingVertical: space.s12,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.borderHair },
  criterionText: { flex: 1, gap: space.s2 },
});
