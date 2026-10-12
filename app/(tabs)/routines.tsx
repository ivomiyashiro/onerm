import { useLocalSearchParams, useRouter } from 'expo-router';

import { RoutinesScreen } from '@/presentation/features/routines/routines-screen';

export default function S13Route() {
  const router = useRouter();
  // `at` changes on every «Elegir una rutina»: the tab stays mounted, so the key remounts it on
  // Plantillas even when `section` was already set.
  const { section, at } = useLocalSearchParams<{ section?: string; at?: string }>();
  return (
    <RoutinesScreen
      key={at}
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
