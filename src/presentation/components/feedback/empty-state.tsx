import { StyleSheet, View } from 'react-native';

import { Button } from '@/presentation/components/button/button';
import { Card } from '@/presentation/components/card/card';
import { Icon, type IconName } from '@/presentation/components/icons/icon';
import { colors, radius, typography } from '@/presentation/theme';
import { Text } from '@/presentation/components/text';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
}

/** Figma «InfoCard»: an empty or informative state inside a screen, with an optional action. */
export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <Card>
      <View style={styles.tile}>
        <Icon name={icon} size={22} color={colors.textPrimary} />
      </View>
      <Text style={[typography.titleM, { color: colors.textPrimary }]} accessibilityRole="header">
        {title}
      </Text>
      {body && <Text style={[typography.bodyM, { color: colors.textSecondary }]}>{body}</Text>}
      {action && <Button variant="secondary" label={action.label} onPress={action.onPress} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgRaised,
  },
});
