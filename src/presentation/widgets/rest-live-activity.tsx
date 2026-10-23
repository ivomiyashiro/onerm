import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, monospacedDigit } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityFactory } from 'expo-widgets';

/** What the Live Activity shows; dates go as epoch ms because the props travel as JSON. */
export interface RestLiveActivityProps {
  title: string;
  next: string;
  startsAt: number;
  endsAt: number;
}

/**
 * The rest on the iPhone lock screen and in the Dynamic Island (#305). The `'widget'` directive
 * turns it into a string that runs in the widget extension, apart from the app: it can only use
 * Expo UI and its props, so the texts come in the props and the colors are written here (marca:
 * accent `y`). The system counts the time down from the range, with no updates from the app.
 */
function RestLiveActivity(props: RestLiveActivityProps) {
  'widget';
  const range = { lower: new Date(props.startsAt), upper: new Date(props.endsAt) };
  const accent = '#FFD400';
  const timer = (size: number) => (
    <Text
      timerInterval={range}
      countsDown
      modifiers={[font({ size, weight: 'bold' }), monospacedDigit(), foregroundStyle(accent)]}
    />
  );
  return {
    banner: (
      <HStack>
        <VStack alignment="leading">
          <Text modifiers={[font({ textStyle: 'headline' })]}>{props.title}</Text>
          <Text
            modifiers={[
              font({ textStyle: 'subheadline' }),
              foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
            ]}
          >
            {props.next}
          </Text>
        </VStack>
        <Spacer />
        {timer(40)}
      </HStack>
    ),
    compactLeading: <Text modifiers={[font({ textStyle: 'caption' })]}>{props.title}</Text>,
    compactTrailing: timer(15),
    minimal: timer(12),
    expandedLeading: <Text modifiers={[font({ textStyle: 'headline' })]}>{props.title}</Text>,
    expandedTrailing: timer(28),
    expandedBottom: (
      <Text
        modifiers={[
          font({ textStyle: 'subheadline' }),
          foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
        ]}
      >
        {props.next}
      </Text>
    ),
  };
}

/** Registered on iOS only: elsewhere the native module of expo-widgets doesn't exist. */
export function createRestLiveActivity(): LiveActivityFactory<RestLiveActivityProps> {
  return createLiveActivity('RestCountdown', RestLiveActivity);
}
