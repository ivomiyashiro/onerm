import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/presentation/components/brand/logo';
import { Button } from '@/presentation/components/button/button';
import { VeiledPhoto, type Veil } from '@/presentation/components/photo/veiled-photo';
import { Text } from '@/presentation/components/text';
import { useWelcomeViewModel } from '@/presentation/features/welcome/use-welcome-view-model';
import { auth } from '@/presentation/strings/auth';
import { colors, space, typography } from '@/presentation/theme';

interface WelcomeScreenProps {
  /** S03 and S02: they need a connection, and arrive with the account (F7). */
  onSignUp: () => void;
  onSignIn: () => void;
}

/** Figma S01 «Velo»: the photo fades into the background towards the text. */
const VEIL: Veil = [
  { offset: 0, opacity: 0.2 },
  { offset: 0.45, opacity: 0.55 },
  { offset: 0.8, opacity: 0.92 },
  { offset: 1, opacity: 1 },
];

/** Figma: the photo covers the top 560 of 844. */
const PHOTO_HEIGHT = '66%';

/** S01 · Bienvenida (RF-AUTH-01): the way in, as a guest or with an account. */
export function WelcomeScreen({ onSignUp, onSignIn }: WelcomeScreenProps) {
  const { actions } = useWelcomeViewModel();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <View style={styles.photo}>
        <VeiledPhoto photo="grip" veil={VEIL} />
      </View>
      <View style={styles.content}>
        <Logo size={56} />
        <Text style={[typography.displayMl, styles.title]} accessibilityRole="header">
          {auth.welcome.title}
        </Text>
        <Text style={[typography.bodyL, { color: colors.textSecondary }]}>{auth.welcome.body}</Text>
      </View>
      <View style={styles.actions}>
        <Button
          variant="primary"
          label={auth.welcome.continueAsGuest}
          icon="arrow"
          onPress={actions.continueAsGuest}
        />
        <Button variant="secondary" label={auth.welcome.signUp} onPress={onSignUp} />
        <Button variant="tertiary" label={auth.welcome.signIn} onPress={onSignIn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.bgBase },
  photo: { position: 'absolute', top: 0, left: 0, right: 0, height: PHOTO_HEIGHT },
  content: { gap: 14, paddingHorizontal: space.s24 },
  title: { color: colors.textPrimary, textTransform: 'uppercase' },
  actions: { gap: space.s8, paddingTop: space.s24, paddingHorizontal: space.s16 },
});
