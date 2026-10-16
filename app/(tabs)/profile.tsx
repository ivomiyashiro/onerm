import { useRouter } from 'expo-router';

import { Button } from '@/presentation/components/button/button';
import { ProfileScreen } from '@/presentation/features/profile/profile-screen';
import { dev } from '@/presentation/strings/dev';

export default function S21Route() {
  const router = useRouter();
  return (
    <ProfileScreen
      onSignUp={() => router.push('/sign-up')}
      onSignIn={(email) => router.push({ pathname: '/sign-in', params: email ? { email } : {} })}
      onAbout={() => router.push('/about')}
      onGoToWorkout={() => router.push('/workout')}
      onIncrements={() => router.push('/increments')}
      onSeeRejectedChanges={() => router.push('/sync-conflicts')}
      devEntry={
        __DEV__ && (
          <Button variant="secondary" label={dev.menuEntry} onPress={() => router.push('/dev')} />
        )
      }
    />
  );
}
