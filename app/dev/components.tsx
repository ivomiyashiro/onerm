import { Redirect } from 'expo-router';

import { ComponentsShowcaseScreen } from '@/presentation/features/dev/components-showcase-screen';

/** Development only: release builds redirect to the home screen. */
export default function DevComponentsRoute() {
  return __DEV__ ? <ComponentsShowcaseScreen /> : <Redirect href="/" />;
}
