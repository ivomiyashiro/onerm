import type { LocalDatabase } from '@/domain/repositories/local-database';
import { PrepareLocalData } from '@/domain/usecases/prepare-local-data';

describe('PrepareLocalData (07 §6)', () => {
  it('prepares the local database', async () => {
    const database: LocalDatabase = { prepare: jest.fn().mockResolvedValue(undefined) };

    await new PrepareLocalData(database).execute();

    expect(database.prepare).toHaveBeenCalledTimes(1);
  });

  it('rejects when a migration fails, and can be retried', async () => {
    const prepare = jest
      .fn()
      .mockRejectedValueOnce(new Error('migration 0001 failed'))
      .mockResolvedValueOnce(undefined);
    const useCase = new PrepareLocalData({ prepare });

    await expect(useCase.execute()).rejects.toThrow('migration 0001 failed');
    await expect(useCase.execute()).resolves.toBeUndefined();
    expect(prepare).toHaveBeenCalledTimes(2);
  });
});
