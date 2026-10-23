/**
 * The rest counting down with the screen locked (#305): an ongoing notification on Android, a Live
 * Activity on iOS. The system draws the countdown from the absolute end, so it only changes when
 * the end moves. Unlike the notice at the end, it needs no exact alarm. Neither method rejects:
 * a failure must not stop the notice or the set.
 */
export interface RestCountdown {
  /** Shows the rest ending at `endsAt`, or moves the one shown; `next` is the set that follows. */
  show(endsAt: Date, next: string): Promise<void>;
  hide(): Promise<void>;
}
