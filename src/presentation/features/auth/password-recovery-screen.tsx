import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/presentation/components/button/button';
import { Notice } from '@/presentation/components/feedback/notice';
import { TextField } from '@/presentation/components/input/text-field';
import { TopBar } from '@/presentation/components/navigation/top-bar';
import { Text } from '@/presentation/components/text';
import { usePasswordRecoveryViewModel } from '@/presentation/features/auth/use-password-recovery-view-model';
import { auth } from '@/presentation/strings/auth';
import { common } from '@/presentation/strings/common';
import { colors, space, typography } from '@/presentation/theme';

interface PasswordRecoveryScreenProps {
  /** S02 passes the email that was typed there. */
  initialEmail?: string;
  onBack: () => void;
  onBackToSignIn: () => void;
}

/** S04 · Recuperar contraseña (RF-AUTH-08.AC1). */
export function PasswordRecoveryScreen({
  initialEmail,
  onBack,
  onBackToSignIn,
}: PasswordRecoveryScreenProps) {
  const { state, actions } = usePasswordRecoveryViewModel(initialEmail);
  const insets = useSafeAreaInsets();
  const sending = state.status === 'sending';
  const sent = state.status === 'sent';

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <TopBar title={auth.recovery.title} backLabel={common.back} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {sent ? (
          <>
            <Text style={typography.titleM}>{auth.recovery.checkEmail}</Text>
            <Notice message={auth.recovery.sentBody} />
            <Text style={[typography.bodyM, { color: colors.textSecondary }]}>
              {auth.recovery.linkExpiryHelp}
            </Text>
            <Button
              variant="secondary"
              label={auth.recovery.backToSignIn}
              onPress={onBackToSignIn}
            />
          </>
        ) : (
          <>
            <Text style={[typography.bodyL, { color: colors.textSecondary }]}>
              {auth.recovery.body}
            </Text>
            <TextField
              label={auth.form.emailLabel}
              value={state.email}
              onChangeText={actions.setEmail}
              error={state.emailError ?? undefined}
              keyboardType="email-address"
              autoComplete="email"
              autoCapitalize="none"
              disabled={sending}
            />
            {state.message !== null && <Notice tone="warn" message={state.message} />}
            <Button
              variant="primary"
              label={auth.recovery.send}
              loading={sending}
              loadingLabel={auth.recovery.sent}
              disabled={!state.canSubmit}
              onPress={actions.submit}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  content: { gap: space.s16, padding: space.s16 },
});
