import { useRouter } from 'expo-router';

import { WorkoutScreen } from '@/presentation/features/workout/workout-screen';

export default function S09Route() {
  const router = useRouter();
  return (
    <WorkoutScreen
      onClose={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onFinished={(id) => router.replace({ pathname: '/workout-summary', params: { id } })}
    />
  );
}
