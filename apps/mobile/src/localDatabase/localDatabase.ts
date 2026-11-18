import { requireOptionalNativeModule } from 'expo';
import { defaultDatabaseDirectory, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import {
  checkBackupExclusion,
  localDatabaseDirectory as directoryOf,
  openInExcludedDirectory,
  resolveBackupExclusion,
  type BackupExclusionModule,
} from './openInExcludedDirectory.ts';

function backupExclusion() {
  return resolveBackupExclusion({ os: Platform.OS, load: () => requireOptionalNativeModule<BackupExclusionModule>('BackupExclusion') });
}

/** The one way to open the phone's database: on iOS it lives in a folder iCloud backup skips. */
export function openLocalDatabase(name: string) {
  return openInExcludedDirectory({ name, backupExclusion: backupExclusion(), openDatabaseAsync });
}

/** The folder `openLocalDatabase` uses, for `deleteDatabaseAsync(name, localDatabaseDirectory())` on account deletion. */
export function localDatabaseDirectory() {
  return directoryOf({ backupExclusion: backupExclusion(), defaultDirectory: defaultDatabaseDirectory });
}

export function checkLocalDatabaseBackup(db: SQLiteDatabase) {
  return checkBackupExclusion({ databasePath: db.databasePath, backupExclusion: backupExclusion() });
}
