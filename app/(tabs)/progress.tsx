import { useRouter } from 'expo-router';

import { HistoryScreen } from '@/presentation/features/progress/history-screen';
import { useWorkoutAction } from '@/presentation/features/workout/use-workout-action';

export default function S18Route() {
  const router = useRouter();
  // «Empezar el próximo» does what the central tab button does (RF-ENT-01).
  const { run } = useWorkoutAction(() => router.push('/workout'));
  return (
    <HistoryScreen
      onOpenWorkout={(id) => router.push({ pathname: '/workout-detail/[id]', params: { id } })}
      onStartNext={() => void run()}
    />
  );
}
