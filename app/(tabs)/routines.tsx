import { useLocalSearchParams, useRouter } from 'expo-router';

import { RoutinesScreen } from '@/presentation/features/routines/routines-screen';

export default function S13Route() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  return (
    <RoutinesScreen
      initialSection={section === 'templates' ? 'templates' : 'mine'}
      onOpenTemplate={(id) => router.push({ pathname: '/template/[id]', params: { id } })}
      onCreateRoutine={() =>
        router.push({ pathname: '/routine-editor/[id]', params: { id: 'new' } })
      }
      onEditRoutine={(id) => router.push({ pathname: '/routine-editor/[id]', params: { id } })}
      onGoToWorkout={() => router.push('/workout')}
    />
  );
}
