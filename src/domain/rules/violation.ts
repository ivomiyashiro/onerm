/**
 * A broken invariant: a code for the caller to pick the message (the texts live in presentation,
 * RNF-21) and the path to the offending part of the aggregate, like `['days', 0, 'name']`.
 */
export interface Violation<Code extends string> {
  readonly code: Code;
  readonly path: readonly (string | number)[];
}
