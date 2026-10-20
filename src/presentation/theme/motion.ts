/**
 * The motion tokens of marca §6 (#248), in ms. Every animation skips its movement with «reduce
 * motion» and none of them loops.
 */
export const motion = {
  /** A control sinks while pressed. */
  press: 120,
  /** A state change: a set done, a value that changes. */
  state: 300,
  /** Something that comes in: a bar, a title, a chart. */
  entrance: 320,
} as const;

/** The spring a pressed control comes back with, and a state settles with: a short, soft bounce. */
export const spring = { speed: 18, bounciness: 6 } as const;
