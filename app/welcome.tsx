import { useRouter } from 'expo-router';

import { WelcomeScreen } from '@/presentation/features/welcome/welcome-screen';

export default function S01Route() {
  const router = useRouter();
  return (
    <WelcomeScreen
      onSignUp={() => router.push('/sign-up')}
      onSignIn={() => router.push('/sign-in')}
    />
  );
}
