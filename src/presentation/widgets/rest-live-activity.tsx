import { HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  activityBackgroundTint,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  multilineTextAlignment,
  padding,
  progressViewStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import {
  createLiveActivity,
  type LiveActivityEnvironment,
  type LiveActivityFactory,
} from 'expo-widgets';

/** What the Live Activity shows; dates go as epoch ms because the props travel as JSON. */
export interface RestLiveActivityProps {
  title: string;
  /** The title once the rest ended. */
  finished: string;
  next: string;
  startsAt: number;
  endsAt: number;
}

/**
 * The rest on the iPhone lock screen and in the Dynamic Island (#305). The `'widget'` directive
 * turns it into a string that runs in the widget extension, apart from the app: it can only use
 * Expo UI and its props, so the texts come in the props and the colors are written here (marca
 * §10 and §15). The system counts the time down and empties the bar from the range, with no
 * updates from the app, and marks it stale at the end, when it says the rest ended until the
 * next one updates it.
 */
function RestLiveActivity(props: RestLiveActivityProps, environment: LiveActivityEnvironment) {
  'widget';
  // Brand tokens (marca §10). The lock screen background is the brand's, translucent: the
  // system blurs the wallpaper behind it (#323), and the texts stay legible whether the lock
  // screen is light or dark, so they don't follow the system's color scheme.
  const lime = '#C5F04A';
  const ok = '#3DD6C4';
  const text = '#F4F4EF';
  const muted = '#A3A39B';
  const glass = '#0E0E0DB8';

  const range = { lower: new Date(props.startsAt), upper: new Date(props.endsAt) };
  const ended = environment.isStale === true;
  const title = ended ? props.finished : props.title;
  const accent = ended ? muted : lime;
  const icon = ended ? 'checkmark.circle.fill' : 'timer';
  // A timer text takes all the width it is offered: a fixed one keeps «m:ss» to the right.
  const timer = (size: number) => (
    <Text
      timerInterval={range}
      countsDown
      modifiers={[
        font({ size, weight: 'bold', design: 'rounded' }),
        monospacedDigit(),
        foregroundStyle(accent),
        multilineTextAlignment('trailing'),
        frame({ width: size * 2.6, alignment: 'trailing' }),
      ]}
    />
  );
  const symbol = <Image systemName={icon} size={15} color={ended ? ok : lime} />;
  const heading = (
    <HStack spacing={6}>
      {symbol}
      <Text
        modifiers={[font({ textStyle: 'subheadline', weight: 'semibold' }), foregroundStyle(text)]}
      >
        {title}
      </Text>
    </HStack>
  );
  const next = (
    <Text modifiers={[font({ textStyle: 'subheadline' }), foregroundStyle(muted), lineLimit(2)]}>
      {props.next}
    </Text>
  );
  // Empties on its own over the rest; once it ended there is nothing left to show.
  const bar = ended ? null : (
    <ProgressView
      timerInterval={range}
      countsDown
      modifiers={[progressViewStyle('linear'), tint(lime)]}
    />
  );
  return {
    banner: (
      <VStack
        alignment="leading"
        spacing={12}
        modifiers={[padding({ all: 16 }), activityBackgroundTint(glass)]}
      >
        <HStack>
          <VStack alignment="leading" spacing={4}>
            {heading}
            {next}
          </VStack>
          <Spacer />
          {timer(44)}
        </HStack>
        {bar}
      </VStack>
    ),
    compactLeading: symbol,
    compactTrailing: timer(15),
    minimal: timer(12),
    expandedLeading: <HStack modifiers={[padding({ leading: 4, top: 4 })]}>{heading}</HStack>,
    expandedTrailing: timer(28),
    expandedBottom: (
      <VStack alignment="leading" spacing={10} modifiers={[padding({ horizontal: 4 })]}>
        {next}
        {bar}
      </VStack>
    ),
  };
}

/** Registered on iOS only: elsewhere the native module of expo-widgets doesn't exist. */
export function createRestLiveActivity(): LiveActivityFactory<RestLiveActivityProps> {
  return createLiveActivity('RestCountdown', RestLiveActivity);
}
