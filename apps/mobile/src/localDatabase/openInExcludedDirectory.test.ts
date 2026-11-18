import {
  checkBackupExclusion,
  localDatabaseDirectory,
  openInExcludedDirectory,
  resolveBackupExclusion,
  type BackupExclusion,
  type BackupExclusionModule,
} from './openInExcludedDirectory.ts';

function fakeNative({ excludedFolders }: { excludedFolders: string[] }) {
  const calls: string[] = [];

  const native = {
    prepareDatabaseDirectory() {
      calls.push('prepare');

      return '/app-support/compound-db';
    },
    isExcludedFromBackup(path: string) {
      calls.push('read');

      return excludedFolders.includes(path);
    },
  } satisfies BackupExclusionModule;

  return { native, calls };
}

describe('resolveBackupExclusion', () => {
  it('throws on iOS when the native module is missing, instead of opening a backed-up database', () => {
    expect(() => resolveBackupExclusion({ os: 'ios', load: () => null })).toThrow('BackupExclusion');
  });

  it('uses the module on iOS', () => {
    const { native } = fakeNative({ excludedFolders: [] });

    expect(resolveBackupExclusion({ os: 'ios', load: () => native })).toEqual({ platform: 'ios', native });
  });

  it('needs no module on Android', () => {
    expect(resolveBackupExclusion({ os: 'android', load: () => null })).toEqual({ platform: 'other' });
  });
});

describe('localDatabaseDirectory', () => {
  it('is the folder the native side prepared on iOS, the same one the database opens in', () => {
    const { native } = fakeNative({ excludedFolders: [] });

    expect(localDatabaseDirectory({ backupExclusion: { platform: 'ios', native }, defaultDirectory: '/documents/SQLite' })).toBe(
      '/app-support/compound-db',
    );
  });

  it('is the default folder on Android', () => {
    expect(localDatabaseDirectory({ backupExclusion: { platform: 'other' }, defaultDirectory: '/data/SQLite' })).toBe('/data/SQLite');
  });
});

describe('openInExcludedDirectory', () => {
  it('opens the database inside the directory the native side prepared, after preparing it', async () => {
    const { native, calls } = fakeNative({ excludedFolders: [] });

    const opened: { name: string; directory: string | undefined }[] = [];

    const db = await openInExcludedDirectory({
      name: 'logger.db',
      backupExclusion: { platform: 'ios', native },
      openDatabaseAsync: async (name, _options, directory) => {
        calls.push('open');

        opened.push({ name, directory });

        return 'db-handle';
      },
    });

    expect(db).toBe('db-handle');
    expect(opened).toEqual([{ name: 'logger.db', directory: '/app-support/compound-db' }]);
    expect(calls).toEqual(['prepare', 'open']);
  });

  it('uses the default directory on Android', async () => {
    const opened: (string | undefined)[] = [];

    await openInExcludedDirectory({
      name: 'logger.db',
      backupExclusion: { platform: 'other' },
      openDatabaseAsync: async (_name, _options, directory) => {
        opened.push(directory);

        return 'db-handle';
      },
    });

    expect(opened).toEqual([undefined]);
  });
});

describe('checkBackupExclusion', () => {
  const ios = (native: BackupExclusionModule): BackupExclusion => ({ platform: 'ios', native });

  it('reports excluded when the folder the database is in carries the flag', () => {
    const { native } = fakeNative({ excludedFolders: ['/app-support/compound-db'] });

    expect(checkBackupExclusion({ databasePath: '/app-support/compound-db/logger.db', backupExclusion: ios(native) })).toEqual({
      kind: 'excluded',
      directory: '/app-support/compound-db',
    });
  });

  it('reports included when the database is in a folder without the flag, even though the right folder is flagged', () => {
    const { native } = fakeNative({ excludedFolders: ['/app-support/compound-db'] });

    expect(checkBackupExclusion({ databasePath: '/documents/SQLite/logger.db', backupExclusion: ios(native) })).toEqual({
      kind: 'included',
      directory: '/documents/SQLite',
    });
  });

  it('only reads the flag, so the check can not make a wrong answer come out right', () => {
    const { native, calls } = fakeNative({ excludedFolders: [] });

    checkBackupExclusion({ databasePath: '/documents/SQLite/logger.db', backupExclusion: ios(native) });

    expect(calls).toEqual(['read']);
  });

  it('reports unsupported on Android', () => {
    expect(checkBackupExclusion({ databasePath: '/data/SQLite/logger.db', backupExclusion: { platform: 'other' } })).toEqual({
      kind: 'unsupported',
    });
  });
});
