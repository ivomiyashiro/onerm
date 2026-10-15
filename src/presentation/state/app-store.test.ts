import { createAppStore } from '@/presentation/state/app-store';

describe('createAppStore', () => {
  it('starts as a guest without backup', () => {
    const store = createAppStore();

    expect(store.getState().account).toEqual({ kind: 'guest' });
    expect(store.getState().syncStatus).toEqual({ kind: 'guest' });
  });

  it('changes the account and the sync status', () => {
    const store = createAppStore();

    store.getState().setAccount({
      kind: 'user',
      userId: 'u-1',
      email: 'ana@mail.com',
      sessionExpired: false,
    });
    store.getState().setSyncStatus({ kind: 'syncing' });

    expect(store.getState().account).toMatchObject({ kind: 'user', userId: 'u-1' });
    expect(store.getState().syncStatus).toEqual({ kind: 'syncing' });
  });

  it('RF-AUTH-06.AC4: the session expires for a user, and a guest has none to expire', () => {
    const store = createAppStore();
    store.getState().markSessionExpired();
    expect(store.getState().account).toEqual({ kind: 'guest' });

    store.getState().setAccount({
      kind: 'user',
      userId: 'u-1',
      email: 'ana@mail.com',
      sessionExpired: false,
    });
    store.getState().markSessionExpired();

    expect(store.getState().account).toMatchObject({ kind: 'user', sessionExpired: true });
  });

  it('creates independent stores', () => {
    const first = createAppStore();
    const second = createAppStore();

    first.getState().setSyncStatus({ kind: 'syncing' });

    expect(second.getState().syncStatus).toEqual({ kind: 'guest' });
  });
});
