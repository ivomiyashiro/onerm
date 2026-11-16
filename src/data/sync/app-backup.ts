import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import { AppState } from 'react-native';

import { appSupabase } from '@/data/auth/app-supabase';
import type { PreparedLocalDatabase } from '@/data/db/sqlite-local-database';
import type { TableChanges } from '@/data/db/table-changes';
import { DeviceSyncTriggers } from '@/data/sync/device-sync-triggers';
import { SupabaseSyncEngine } from '@/data/sync/supabase-sync-engine';
import { SyncGuestUnion } from '@/data/sync/sync-guest-union';
import { SyncRejectedChangeRepository } from '@/data/sync/sync-rejected-change-repository';
import type { RejectedChangeRepository } from '@/domain/repositories/rejected-change-repository';
import type { GuestUnion } from '@/domain/services/guest-union';
import type { SyncEngine } from '@/domain/services/sync-engine';
import type { SyncTriggers } from '@/domain/services/sync-triggers';

/** The automatic backup (RF-SYNC-01): the engine, what it would upload, and its triggers. */
export interface Backup {
  engine: SyncEngine;
  countUploadable(): Promise<number>;
  triggers: SyncTriggers;
  rejected: RejectedChangeRepository;
  union: GuestUnion;
}

/**
 * The sync of 07 §4.1 against the configured server, triggered by the phone (RN-SYNC-06). Without
 * a server there is nothing to back up to, like a guest's device.
 */
export function appBackup({
  localDatabase,
  changes,
}: {
  localDatabase: PreparedLocalDatabase;
  changes: TableChanges;
}): Backup {
  const client = appSupabase()?.client;
  // Only `isConnected` is used: NetInfo's reachability check would poll a URL every minute,
  // also in the background (RNF-22, #180).
  NetInfo.configure({ reachabilityShouldRun: () => false });
  const triggers = new DeviceSyncTriggers(changes, AppState, NetInfo);
  const rejected = new SyncRejectedChangeRepository(
    () => localDatabase.database,
    changes,
    client ?? null,
  );
  const union = new SyncGuestUnion(() => localDatabase.database, client ?? null);
  if (client === undefined) {
    return {
      engine: { sync: async () => 'guest' },
      countUploadable: async () => 0,
      triggers,
      rejected,
      union,
    };
  }
  const engine = new SupabaseSyncEngine(
    () => localDatabase.database,
    client,
    Constants.expoConfig?.version ?? '0.0.0',
  );
  return {
    engine,
    countUploadable: () => engine.countUploadable(),
    triggers,
    rejected,
    union,
  };
}
