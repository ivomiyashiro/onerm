/**
 * Who the device belongs to and whether their authentication session is alive (RF-AUTH-06). A user
 * whose session expired keeps their data and pending changes on the device (RN-AUTH-07).
 */
export type AccountState =
  | { kind: 'guest' }
  | { kind: 'user'; userId: string; email: string | null; sessionExpired: boolean };
