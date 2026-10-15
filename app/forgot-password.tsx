import { useLocalSearchParams, useRouter } from 'expo-router';

import { PasswordRecoveryScreen } from '@/presentation/features/auth/password-recovery-screen';

export default function S04Route() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const toSignIn = () => (router.canGoBack() ? router.back() : router.replace('/sign-in'));
  return (
    <PasswordRecoveryScreen initialEmail={email} onBack={toSignIn} onBackToSignIn={toSignIn} />
  );
}
