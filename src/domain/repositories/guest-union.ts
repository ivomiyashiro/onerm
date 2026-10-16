/** What the guest has on the device (RN-AUTH-05), as D01 and D01b count it. */
export interface GuestSummary {
  /** Finished workouts, not deleted. */
  workouts: number;
  /** Routines, not deleted. */
  routines: number;
  workoutInProgress: boolean;
}

/** The union of the guest's data with an account (07 §4.3, RF-AUTH-05). */
export interface GuestUnion {
  guestSummary(): Promise<GuestSummary>;
  /** Step 1: whether the account has data on the server (RN-AUTH-05). Needs the connection. */
  accountHasData(userId: string): Promise<boolean | 'offline'>;
  /**
   * Steps 2 and 4–6, locally and in one transaction: the profile (RN-AUTH-06), the guest's rows
   * united to the account or deleted, and the device becomes the account's. Reads the account's
   * profile from the server first.
   */
  unite(input: {
    userId: string;
    email: string | null;
    keepGuestData: boolean;
  }): Promise<'done' | 'offline'>;
}
