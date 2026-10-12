import { useRouter } from 'expo-router';

import { HomeScreen } from '@/presentation/features/home/home-screen';

export default function S07Route() {
  const router = useRouter();
  return (
    <HomeScreen
      onChooseRoutine={() =>
        router.navigate({
          pathname: '/routines',
          params: { section: 'templates', at: String(Date.now()) },
        })
      }
      onCreateRoutine={() =>
        router.push({ pathname: '/routine-editor/[id]', params: { id: 'new' } })
      }
    />
  );
}
