import type { SQLiteDatabase, SQLiteOpenOptions } from 'expo-sqlite';
import type { Platform } from 'react-native';

/** What `modules/backup-exclusion` (iOS only) offers. */
export type BackupExclusionModule = {
  prepareDatabaseDirectory(): string;
  isExcludedFromBackup(path: string): boolean;
};

/** Only iOS has the module. Everywhere else the database opens in `expo-sqlite`'s default folder. */
export type BackupExclusion = { platform: 'ios'; native: BackupExclusionModule } | { platform: 'other' };

export type OpenInExcludedDirectoryOptions<Db = SQLiteDatabase> = {
  name: string;
  backupExclusion: BackupExclusion;
  openDatabaseAsync: (name: string, options: SQLiteOpenOptions | undefined, directory: string | undefined) => Promise<Db>;
};

export type BackupCheck = { kind: 'excluded' | 'included'; directory: string } | { kind: 'unsupported' };

/**
 * A missing module on iOS throws instead of falling back to `Documents/SQLite`, which iCloud backs up,
 * and instead of opening a second, empty database next to one that still holds sets that haven't uploaded.
 */
export function resolveBackupExclusion({
  os,
  load,
}: {
  os: typeof Platform.OS;
  load: () => BackupExclusionModule | null;
}): BackupExclusion {
  if (os !== 'ios') {
    return { platform: 'other' };
  }

  const native = load();

  if (native === null) {
    throw new Error('The BackupExclusion native module is missing from this iOS build. Rebuild the app.');
  }

  return { platform: 'ios', native };
}

/** The folder the phone's database lives in, without opening one. Deleting the database needs it. */
export function localDatabaseDirectory({
  backupExclusion,
  defaultDirectory,
}: {
  backupExclusion: BackupExclusion;
  defaultDirectory: string;
}) {
  return backupExclusion.platform === 'ios' ? backupExclusion.native.prepareDatabaseDirectory() : defaultDirectory;
}

export async function openInExcludedDirectory<Db>({
  name,
  backupExclusion,
  openDatabaseAsync,
}: OpenInExcludedDirectoryOptions<Db>) {
  const directory = backupExclusion.platform === 'ios' ? backupExclusion.native.prepareDatabaseDirectory() : undefined;

  return openDatabaseAsync(name, undefined, directory);
}

/** Reads the flag on the folder the open database really lives in, and never sets it. */
export function checkBackupExclusion({
  databasePath,
  backupExclusion,
}: {
  databasePath: string;
  backupExclusion: BackupExclusion;
}): BackupCheck {
  if (backupExclusion.platform === 'other') {
    return { kind: 'unsupported' };
  }

  const directory = databasePath.slice(0, databasePath.lastIndexOf('/'));

  return { kind: backupExclusion.native.isExcludedFromBackup(directory) ? 'excluded' : 'included', directory };
}
