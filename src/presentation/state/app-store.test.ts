import { createAppStore } from '@/presentation/state/app-store';

describe('createAppStore', () => {
  it('starts as a guest without backup', () => {
    const store = createAppStore();

    expect(store.getState().owner).toEqual({ kind: 'guest' });
    expect(store.getState().syncStatus).toEqual({ kind: 'guest' });
  });

  it('changes the owner and the sync status', () => {
    const store = createAppStore();

    store.getState().setOwner({ kind: 'user', userId: 'u-1' });
    store.getState().setSyncStatus({ kind: 'syncing' });

    expect(store.getState().owner).toEqual({ kind: 'user', userId: 'u-1' });
    expect(store.getState().syncStatus).toEqual({ kind: 'syncing' });
  });

  it('creates independent stores', () => {
    const first = createAppStore();
    const second = createAppStore();

    first.getState().setSyncStatus({ kind: 'syncing' });

    expect(second.getState().syncStatus).toEqual({ kind: 'guest' });
  });
});
