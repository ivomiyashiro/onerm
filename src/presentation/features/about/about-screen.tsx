import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/presentation/components/brand/logo';
import { TopBar } from '@/presentation/components/navigation/top-bar';
import { Text } from '@/presentation/components/text';
import { CREDITS, type Credit } from '@/presentation/features/about/credits';
import { common } from '@/presentation/strings/common';
import { profile } from '@/presentation/strings/profile';
import { colors, fonts, radius, space, typography } from '@/presentation/theme';

interface AboutScreenProps {
  /** The app version, from the native build. */
  version: string;
  onBack: () => void;
  onOpenLink: (url: string) => void;
}

const { about } = profile;

/** S22 · Acerca de y créditos (RF-CAT-05): the version and the third-party sources. */
export function AboutScreen({ version, onBack, onOpenLink }: AboutScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <TopBar title={about.title} backLabel={common.back} onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.brand}>
          <Logo />
          <View style={styles.brandTexts}>
            <Text style={styles.brandName}>
              {about.appName.one}
              <Text style={{ color: colors.textAccent }}>{about.appName.rm}</Text>
            </Text>
            <Text style={[typography.monoS, { color: colors.textSecondary }]}>
              {about.version(version)}
            </Text>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={[typography.label, styles.sectionLabel]}>{about.credits}</Text>
          <View style={styles.list}>
            {CREDITS.map((credit, i) => (
              <CreditRow
                key={credit.url}
                credit={credit}
                first={i === 0}
                onPress={() => onOpenLink(credit.url)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function CreditRow({
  credit,
  first,
  onPress,
}: {
  credit: Credit;
  first: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !first && styles.divider,
        pressed && { backgroundColor: colors.bgRaised },
      ]}
    >
      <Text style={[typography.bodyRow, { color: colors.textPrimary }]}>{credit.title}</Text>
      <Text style={[typography.bodyS, { color: colors.textSecondary }]}>{credit.detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  content: { gap: 18, paddingTop: 8, paddingHorizontal: space.s16 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: 4 },
  brandTexts: { gap: 2 },
  // Figma S22: the wordmark in mixed case, not a text style (the display styles are uppercase).
  brandName: {
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 24,
    letterSpacing: -0.24,
    color: colors.textPrimary,
  },
  section: { gap: 8 },
  sectionLabel: { color: colors.textSecondary, paddingLeft: 4 },
  list: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  row: {
    gap: 2,
    minHeight: 56,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.borderHair },
});
