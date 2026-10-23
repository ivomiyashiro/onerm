import { requireOptionalNativeModule } from 'expo';

interface RestCountdownModule {
  show(endsAtMs: number, title: string, body: string, channelName: string): void;
  hide(): void;
}

/**
 * The local module of `modules/rest-countdown` (#305): the ongoing notification on Android. Where
 * it isn't built in (iOS, tests in Node, web), there is nothing to show.
 */
export const RestCountdownNotification: RestCountdownModule =
  requireOptionalNativeModule<RestCountdownModule>('RestCountdown') ?? {
    show: () => {},
    hide: () => {},
  };
