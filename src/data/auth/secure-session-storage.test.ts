import {
  createSecureSessionStorage,
  SealedDataRejected,
  type BlobStore,
  type Cipher,
  type KeyVault,
} from '@/data/auth/secure-session-storage';

/** A toy cipher: the "seal" is the text reversed with the key in front, and the wrong key rejects. */
const fakeCipher: Cipher = {
  generateKey: jest.fn(async () => `key-${Math.random()}`),
  encrypt: async (key, plain) => `${key}|${[...plain].reverse().join('')}`,
  decrypt: async (key, sealed) => {
    const [sealedKey, body] = sealed.split('|');
    if (sealedKey !== key) throw new SealedDataRejected();
    return [...body].reverse().join('');
  },
};

function setup(cipher: Cipher = fakeCipher) {
  const keys = { stored: null as string | null };
  const vault: KeyVault = {
    get: async () => keys.stored,
    set: async (key) => {
      keys.stored = key;
    },
  };
  const files = new Map<string, string>();
  const blobs: BlobStore = {
    get: async (name) => files.get(name) ?? null,
    set: async (name, value) => void files.set(name, value),
    remove: async (name) => void files.delete(name),
  };
  return { keys, files, storage: createSecureSessionStorage({ vault, blobs, cipher }) };
}

describe('secure session storage (RNF-07, 07 §1.1)', () => {
  it('gives back what was saved', async () => {
    const { storage } = setup();

    await storage.setItem('session', '{"token":"abc"}');

    await expect(storage.getItem('session')).resolves.toBe('{"token":"abc"}');
  });

  it('never writes the session in plain text', async () => {
    const { storage, files } = setup();

    await storage.setItem('session', '{"token":"abc"}');

    expect([...files.values()].join()).not.toContain('abc');
  });

  it('is null when nothing was saved, without creating a key', async () => {
    const { storage, keys } = setup();

    await expect(storage.getItem('session')).resolves.toBeNull();
    expect(keys.stored).toBeNull();
  });

  it('creates the key once and uses it again after a restart', async () => {
    const { storage, keys, files } = setup();
    await storage.setItem('session', 'one');
    const created = keys.stored;

    const afterRestart = createSecureSessionStorage({
      vault: { get: async () => keys.stored, set: async () => undefined },
      blobs: {
        get: async (name) => files.get(name) ?? null,
        set: async () => undefined,
        remove: async () => undefined,
      },
      cipher: fakeCipher,
    });

    await expect(afterRestart.getItem('session')).resolves.toBe('one');
    expect(keys.stored).toBe(created);
  });

  it('two writes at the same time share one key', async () => {
    const { storage } = setup();
    const generate = jest.spyOn(fakeCipher, 'generateKey');
    generate.mockClear();

    await Promise.all([storage.setItem('a', '1'), storage.setItem('b', '2')]);

    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('a lost key or altered data counts as no session, and the envelope is removed', async () => {
    const { storage, keys, files } = setup();
    await storage.setItem('session', 'one');
    keys.stored = 'another-key';
    const reopened = createSecureSessionStorage({
      vault: { get: async () => keys.stored, set: async () => undefined },
      blobs: {
        get: async (name) => files.get(name) ?? null,
        set: async () => undefined,
        remove: async (name) => void files.delete(name),
      },
      cipher: fakeCipher,
    });

    await expect(reopened.getItem('session')).resolves.toBeNull();
    expect(files.has('session')).toBe(false);
  });

  it('any other error is a bug: it propagates and the session is kept (spike #15)', async () => {
    const broken: Cipher = {
      ...fakeCipher,
      decrypt: async () => {
        throw new Error('Value is a string, expected an Object');
      },
    };
    const { storage, files } = setup(broken);
    files.set('session', 'whatever');

    await expect(storage.getItem('session')).rejects.toThrow('expected an Object');
    expect(files.has('session')).toBe(true);
  });

  it('removes the session', async () => {
    const { storage, files } = setup();
    await storage.setItem('session', 'one');

    await storage.removeItem('session');

    expect(files.size).toBe(0);
  });
});
