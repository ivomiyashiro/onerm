import type { SupabaseClient } from '@supabase/supabase-js';

import type { AppDatabase } from '@/data/db/app-database';
import { currentUserId } from '@/data/db/sync-writes';
import type { RestoreProgress, SyncEngine, SyncResult } from '@/domain/repositories/sync-engine';
import { isOlderVersion } from '@/domain/rules/sync/sync-timing';

import { countToPull, pullCatalog, pullChanges } from './pull';
import { countUploadable, pushChanges } from './push';
import { isRestored, markRestored, markSynced } from './sync-state-table';

/**
 * The sync of 07 §4.1 against Supabase, straight from the client (ADR-0001): minimum version, then
 * the catalog, then the user's push and pull. Any failure of the network or the server ends the
 * run as `failed`; what was already applied stays, and the next run continues from there.
 */
export class SupabaseSyncEngine implements SyncEngine {
  constructor(
    private readonly db: () => AppDatabase,
    private readonly client: SupabaseClient,
    /** The installed app's version (`app.json`), compared with the server's minimum. */
    private readonly appVersion: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async sync(onRestore?: (progress: RestoreProgress) => void): Promise<SyncResult> {
    try {
      if (await this.isOutdated()) return 'appOutdated';
      // Catalog first (RN-SYNC-06): a pulled row may name an exercise that only it brings
      // (ADR-0002 R7). If it fails, the network is down for the push too.
      await pullCatalog(this.db(), this.client);

      // A guest only downloads the catalog (RN-SYNC-09); so does a guest merge not finished yet.
      const owner = currentUserId(this.db());
      if (owner === null) return 'guest';

      // Only the session of the device's owner may move its data (RN-AUTH-07). Without it the
      // requests would go out anonymously and every row would be rejected by RLS.
      const { data, error } = await this.client.auth.getSession();
      if (error !== null) return 'failed';
      if (data.session?.user.id !== owner) return 'sessionExpired';

      await pushChanges(this.db(), this.client, owner);
      await this.pull(owner, onRestore);
      markSynced(this.db(), this.now());
      return 'synced';
    } catch {
      return 'failed';
    }
  }

  /**
   * The pull of the user's tables. While the account is not restored yet, it counts first what is
   * left to download and reports each page (RF-SYNC-03, S23); a full pull completes the
   * restoration (07 §4.2). An interrupted one resumes from the cursors.
   */
  private async pull(owner: string, onRestore?: (progress: RestoreProgress) => void) {
    const db = this.db();
    if (isRestored(db)) {
      await pullChanges(db, this.client, owner);
      return;
    }
    const total = await countToPull(db, this.client, owner);
    let done = 0;
    onRestore?.({ done, total });
    await pullChanges(db, this.client, owner, undefined, (count) => {
      // The overlap re-reads a few rows: the count never goes past the total.
      done = Math.min(total, done + count);
      onRestore?.({ done, total });
    });
    markRestored(db);
  }

  /** What the next push would upload; nothing for a guest (RN-SYNC-08, RN-SYNC-09). */
  async countUploadable(): Promise<number> {
    const owner = currentUserId(this.db());
    return owner === null ? 0 : countUploadable(this.db(), owner);
  }

  /** RN-SYNC-14: the server publishes the minimum version that can sync. */
  private async isOutdated(): Promise<boolean> {
    const { data, error } = await this.client.from('app_config').select('min_app_version').single();
    if (error !== null) throw error;
    return isOlderVersion(this.appVersion, (data as { min_app_version: string }).min_app_version);
  }
}
