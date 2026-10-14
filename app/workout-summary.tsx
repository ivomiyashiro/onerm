import { useLocalSearchParams, useRouter } from 'expo-router';

import { WorkoutSummaryScreen } from '@/presentation/features/summary/workout-summary-screen';

export default function S12Route() {
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  return <WorkoutSummaryScreen workoutId={id} onDone={() => router.replace('/')} />;
}
