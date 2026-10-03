// SPIKE #15 — 07 §1.1: AES key in the Keystore, encrypted session in local storage. Not merged.
import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Storage } from 'expo-sqlite/kv-store';

const KEY_NAME = 'onerm.session-key';

let keyPromise: Promise<AESEncryptionKey> | null = null;

function sessionKey(): Promise<AESEncryptionKey> {
  keyPromise ??= (async () => {
    const stored = await SecureStore.getItemAsync(KEY_NAME);
    if (stored) return AESEncryptionKey.import(stored, 'hex');
    const key = await AESEncryptionKey.generate(); // 256 bits, from the platform CSPRNG
    await SecureStore.setItemAsync(KEY_NAME, await key.encoded('hex'), {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    return key;
  })();
  return keyPromise;
}

/** `storage` for supabase-js: values are AES-256-GCM sealed (random IV, auth tag) before hitting disk. */
export const secureSessionStorage = {
  async getItem(name: string): Promise<string | null> {
    const stored = await Storage.getItemAsync(name);
    console.log(
      `[spike15] getItem ${name}: ${stored === null ? 'null' : `${stored.length} chars`} keys=${(await Storage.getAllKeysAsync()).join(',')}`,
    );
    if (stored === null) return null;
    try {
      // On Android fromCombined() rejects a base64 string: it needs the bytes.
      const sealed = AESSealedData.fromCombined(
        Uint8Array.from(atob(stored), (c) => c.charCodeAt(0)),
      );
      const bytes = await aesDecryptAsync(sealed, await sessionKey());
      return new TextDecoder().decode(bytes);
    } catch (e) {
      console.log(`[spike15] getItem failed: ${String(e)}`);
      // Key lost or data tampered with: behave as signed out instead of crashing.
      await Storage.removeItemAsync(name);
      return null;
    }
  },
  async setItem(name: string, value: string): Promise<void> {
    try {
      const sealed = await aesEncryptAsync(new TextEncoder().encode(value), await sessionKey());
      await Storage.setItemAsync(name, (await sealed.combined('base64')) as string);
      const back = await Storage.getItemAsync(name);
      const keys = await Storage.getAllKeysAsync();
      console.log(
        `[spike15] setItem ${name} ok (${value.length} chars), read back ${back?.length ?? 'null'}, keys=${keys.join(',')}`,
      );
    } catch (e) {
      console.log(`[spike15] setItem failed: ${String(e)}`);
      throw e;
    }
  },
  async removeItem(name: string): Promise<void> {
    console.log(`[spike15] removeItem ${name}`);
    await Storage.removeItemAsync(name);
  },
};
