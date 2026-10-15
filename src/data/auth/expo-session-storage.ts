import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Storage } from 'expo-sqlite/kv-store';

import {
  createSecureSessionStorage,
  SealedDataRejected,
  type BlobStore,
  type Cipher,
  type KeyVault,
} from '@/data/auth/secure-session-storage';

const KEY_NAME = 'onerm.session-key';

/** Keychain on iOS, Keystore on Android; the key doesn't travel in backups (spike #15). */
const vault: KeyVault = {
  get: () => SecureStore.getItemAsync(KEY_NAME),
  set: (key) =>
    SecureStore.setItemAsync(KEY_NAME, key, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    }),
};

const blobs: BlobStore = {
  get: (name) => Storage.getItemAsync(name),
  set: (name, value) => Storage.setItemAsync(name, value),
  remove: async (name) => {
    await Storage.removeItemAsync(name);
  },
};

/** AES-256-GCM from the platform: it also authenticates, so altered data is refused. */
const cipher: Cipher = {
  async generateKey() {
    return (await AESEncryptionKey.generate()).encoded('hex');
  },
  async encrypt(key, plain) {
    const sealed = await aesEncryptAsync(
      new TextEncoder().encode(plain),
      await AESEncryptionKey.import(key, 'hex'),
    );
    return (await sealed.combined('base64')) as string;
  },
  async decrypt(key, sealed) {
    // On Android fromCombined() rejects a base64 string: it needs the bytes (spike #15).
    const envelope = AESSealedData.fromCombined(
      Uint8Array.from(atob(sealed), (c) => c.charCodeAt(0)),
    );
    const aesKey = await AESEncryptionKey.import(key, 'hex');
    try {
      return new TextDecoder().decode(await aesDecryptAsync(envelope, aesKey));
    } catch {
      throw new SealedDataRejected();
    }
  },
};

/** The session storage of the app: sealed with AES, the key in the Keystore. */
export const expoSessionStorage = createSecureSessionStorage({ vault, blobs, cipher });
