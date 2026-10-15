/** The place the AES key lives: Keychain or Keystore (07 §1.1). */
export interface KeyVault {
  get(): Promise<string | null>;
  set(key: string): Promise<void>;
}

/** Where the sealed sessions are written: any key-value store. */
export interface BlobStore {
  get(name: string): Promise<string | null>;
  set(name: string, value: string): Promise<void>;
  remove(name: string): Promise<void>;
}

/** The AES-GCM seal. The key is a hex string. */
export interface Cipher {
  generateKey(): Promise<string>;
  encrypt(key: string, plain: string): Promise<string>;
  /** Throws `SealedDataRejected` when the data doesn't authenticate with that key. */
  decrypt(key: string, sealed: string): Promise<string>;
}

/** The key is wrong or the data was altered: GCM refuses it. Any other error is not this one. */
export class SealedDataRejected extends Error {
  constructor() {
    super('The sealed session did not authenticate');
  }
}

/** The `storage` option of supabase-js. */
export interface SessionStorage {
  getItem(name: string): Promise<string | null>;
  setItem(name: string, value: string): Promise<void>;
  removeItem(name: string): Promise<void>;
}

/**
 * RNF-07, 07 §1.1: the session (access and refresh tokens) doesn't fit the ~2 KB of a secure-store
 * value, so it is sealed with an AES key that lives in the Keystore and the sealed envelope goes
 * to the local storage. It never touches the disk in plain text.
 */
export function createSecureSessionStorage(deps: {
  vault: KeyVault;
  blobs: BlobStore;
  cipher: Cipher;
}): SessionStorage {
  const { vault, blobs, cipher } = deps;

  // One key per launch: two reads at the same time must not generate two keys.
  let key: Promise<string> | null = null;
  const sessionKey = () =>
    (key ??= (async () => {
      const stored = await vault.get();
      if (stored !== null) return stored;
      const created = await cipher.generateKey();
      await vault.set(created);
      return created;
    })());

  return {
    async getItem(name) {
      const sealed = await blobs.get(name);
      if (sealed === null) return null;
      try {
        return await cipher.decrypt(await sessionKey(), sealed);
      } catch (error) {
        if (!(error instanceof SealedDataRejected)) throw error;
        // The key was lost or the data altered: it is as if there was no session. Any other
        // error is a bug, and the session must not be thrown away because of it (spike #15).
        await blobs.remove(name);
        return null;
      }
    },
    async setItem(name, value) {
      await blobs.set(name, await cipher.encrypt(await sessionKey(), value));
    },
    async removeItem(name) {
      await blobs.remove(name);
    },
  };
}
