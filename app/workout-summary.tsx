import { useLocalSearchParams, useRouter } from 'expo-router';

import { WorkoutSummaryScreen } from '@/presentation/features/summary/workout-summary-screen';

export default function S12Route() {
  const router = useRouter();
  // A link can repeat the param; a missing or unknown id shows nothing and goes back.
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const workoutId = (Array.isArray(id) ? id[0] : id) ?? '';
  return <WorkoutSummaryScreen workoutId={workoutId} onDone={() => router.replace('/')} />;
}
