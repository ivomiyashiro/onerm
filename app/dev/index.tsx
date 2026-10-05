import { Redirect, useRouter, type Href } from 'expo-router';

import { DevMenuScreen } from '@/presentation/features/dev/dev-menu-screen';

/** Development only: release builds redirect to the home screen. */
export default function DevMenuRoute() {
  const router = useRouter();
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <DevMenuScreen
      onOpen={({ pathname, params }) => router.push({ pathname, params } as Href)}
      onOpenComponents={() => router.push('/dev/components')}
      onOpenBenchmark={() => router.push('/dev/benchmark')}
    />
  );
}
