import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';

import { AboutScreen } from '@/presentation/features/about/about-screen';

export default function S22Route() {
  const router = useRouter();
  return (
    <AboutScreen
      version={Constants.expoConfig?.version ?? ''}
      onBack={() => router.back()}
      onOpenLink={(url) => void Linking.openURL(url)}
    />
  );
}
