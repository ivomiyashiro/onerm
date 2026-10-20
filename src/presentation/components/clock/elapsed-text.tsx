import type { StyleProp, TextStyle } from 'react-native';

import { useElapsed } from '@/presentation/components/clock/use-elapsed';
import { Text } from '@/presentation/components/text';

/**
 * The running time since `startedAt` as a leaf: only this text renders every second, not the
 * screen that shows it (#229). `format` puts it in a sentence («En curso · 18:42»).
 */
export function ElapsedText({
  startedAt,
  format = (time) => time,
  style,
}: {
  startedAt: Date | null;
  format?: (time: string) => string;
  style?: StyleProp<TextStyle>;
}) {
  const time = useElapsed(startedAt);
  return <Text style={style}>{time === null ? null : format(time)}</Text>;
}
