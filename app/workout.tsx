import { Stack, useRouter } from 'expo-router';

import { WorkoutScreen } from '@/presentation/features/workout/workout-screen';

export default function S09Route() {
  const router = useRouter();
  return (
    <>
      {/* Back only from the edge: a swipe across the screen changes the exercise (08 §5). */}
      <Stack.Screen options={{ fullScreenGestureEnabled: false }} />
      <WorkoutScreen
        onClose={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        onFinished={(id) => router.replace({ pathname: '/workout-summary', params: { id } })}
      />
    </>
  );
}
