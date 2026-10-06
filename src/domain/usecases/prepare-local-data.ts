import type { LocalDatabase } from '@/domain/repositories/local-database';

/**
 * Leaves the local database ready before the UI mounts (07 §6). If a migration fails it rejects,
 * the database is never deleted, and the user can retry.
 */
export class PrepareLocalData {
  constructor(private readonly database: LocalDatabase) {}

  execute(): Promise<void> {
    return this.database.prepare();
  }
}
