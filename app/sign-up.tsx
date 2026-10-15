import { useRouter } from 'expo-router';

import { SignUpScreen } from '@/presentation/features/auth/sign-up-screen';

export default function S03Route() {
  const router = useRouter();
  return (
    <SignUpScreen
      onBack={() => router.back()}
      onDone={() => (router.canGoBack() ? router.dismissAll() : router.replace('/'))}
      onSignIn={(email) =>
        router.replace(email ? { pathname: '/sign-in', params: { email } } : '/sign-in')
      }
    />
  );
}
