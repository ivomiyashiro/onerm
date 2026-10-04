/**
 * Receives the values of an observed query (ADR-0011 §3): `next` runs once on subscribe and again
 * after every change in the local database.
 */
export interface Observer<T> {
  next(value: T): void;
  error(error: unknown): void;
}

/** Stops an observation. Calling it twice has no effect. */
export type Unsubscribe = () => void;
