/**
 * The database on the device. It has to be prepared (opened and migrated) before any repository
 * is used (07 §6, ADR-0010).
 */
export interface LocalDatabase {
  /** Opens the database and applies the pending migrations. Rejects if any of them fails. */
  prepare(): Promise<void>;
}
