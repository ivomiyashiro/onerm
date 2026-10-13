import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/presentation/components/button/button';
import { BottomSheet } from '@/presentation/components/overlay/bottom-sheet';
import { Text } from '@/presentation/components/text';
import type { WhyDetail } from '@/presentation/features/workout/reason-text';
import { common } from '@/presentation/strings/common';
import { suggestions } from '@/presentation/strings/suggestions';
import { colors, radius, space, typography } from '@/presentation/theme';

interface WhySheetProps {
  /** Null while closed. */
  detail: WhyDetail | null;
  onClose: () => void;
}

/**
 * S10 «¿Por qué?» (RF-SUG-07.AC2, Figma «S10 · ¿Por qué?»): the rule, the data it used and «En qué
 * nos basamos», which opens the plain summary of the principle in place (13 §4, §6).
 */
export function WhySheet({ detail, onClose }: WhySheetProps) {
  const [principleOpen, setPrincipleOpen] = useState(false);
  // The last detail stays while the sheet slides away.
  const [shown, setShown] = useState(detail);
  if (detail !== null && detail !== shown) {
    setShown(detail);
    // Every opening starts with the principle folded.
    setPrincipleOpen(false);
  }
  const close = () => {
    setPrincipleOpen(false);
    onClose();
  };

  return (
    <BottomSheet
      visible={detail !== null}
      title={shown?.title ?? suggestions.why.calibrationTitle}
      closeLabel={common.close}
      onClose={close}
    >
      {shown && (
        <View style={styles.content}>
          <Text style={[typography.bodyL, { color: colors.textPrimary }]}>{shown.body}</Text>
          {shown.facts.length > 0 && (
            <View style={styles.facts}>
              {shown.facts.map((fact, index) => (
                <View key={fact.label} style={[styles.fact, index > 0 && styles.divider]}>
                  <Text style={[typography.bodyM, styles.flex, { color: colors.textSecondary }]}>
                    {fact.label}
                  </Text>
                  <Text style={[typography.numberSm, { color: colors.textPrimary }]}>
                    {fact.value}
                  </Text>
                </View>
              ))}
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: principleOpen }}
            onPress={() => setPrincipleOpen((open) => !open)}
            style={styles.link}
          >
            <Text style={[typography.bodyLStrong, styles.linkText]}>
              {suggestions.why.basedOn(shown.principle.name)}
            </Text>
          </Pressable>
          {principleOpen && (
            <Text style={[typography.bodyM, { color: colors.textSecondary }]}>
              {shown.principle.summary}
            </Text>
          )}
          <Button
            variant="secondary"
            size="xl"
            label={suggestions.why.understood}
            onPress={close}
          />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.s12, paddingBottom: space.s4 },
  facts: { borderRadius: radius.lg, backgroundColor: colors.bgRaised },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s8,
    paddingVertical: space.s12,
    paddingHorizontal: space.s16,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.borderHair },
  flex: { flex: 1 },
  link: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center' },
  linkText: {
    color: colors.textPrimary,
    textDecorationLine: 'underline',
    textDecorationColor: colors.textTertiary,
  },
});
