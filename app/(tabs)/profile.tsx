import { useRouter } from 'expo-router';

import { Button } from '@/presentation/components/button/button';
import { ScreenPlaceholder } from '@/presentation/features/dev/screen-placeholder';
import { dev } from '@/presentation/strings/dev';

export default function ProfileRoute() {
  const router = useRouter();
  return (
    <ScreenPlaceholder
      id="S21"
      footer={
        __DEV__ && (
          <Button variant="secondary" label={dev.menuEntry} onPress={() => router.push('/dev')} />
        )
      }
    />
  );
}
