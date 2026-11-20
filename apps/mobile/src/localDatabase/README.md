# The phone's local database

For the logger: open the database with `openLocalDatabase(name)` from `localDatabase.ts`. Never call `expo-sqlite`'s `openDatabaseAsync` directly.

## Why

[PRD section 11](../../../../docs/prd/README.md#11-accounts-privacy-and-security) says the local database is excluded from iCloud backup. `expo-sqlite` has no option for that, and it puts databases in `Documents/SQLite`, which iOS backs up. JavaScript can't set the exclusion flag either.

## How

`apps/mobile/modules/backup-exclusion` is a small local Expo module (Swift, iOS only). Its `prepareDatabaseDirectory()`:

1. creates `Library/Application Support/compound-db/`,
2. sets `isExcludedFromBackup` (`NSURLIsExcludedFromBackupKey`) on that directory,
3. returns its path.

`openLocalDatabase` calls it before every open and passes the path as `expo-sqlite`'s `directory` argument. The flag is on the directory, so the `-wal` and `-shm` files SQLite creates later are excluded too. Calling it on every open is cheap and sets the flag again if it was ever lost.

On Android there is no module, so the database opens in `expo-sqlite`'s default folder. Android backup is out of scope for the PRD. On iOS a missing module throws (`resolveBackupExclusion`) rather than falling back to `Documents/SQLite`: that folder is backed up, and a later correct build would open a different, empty file and strand sets that hadn't uploaded.

## Rules for the logger

- One database file, opened through `openLocalDatabase`. A second database opened another way would be backed up.
- Don't move the database to `Library/Caches`: iOS may delete it under storage pressure, and it holds sets that haven't uploaded yet.
- Account deletion removes the database through `deleteDatabaseAsync(name, localDatabaseDirectory())`. `localDatabaseDirectory()` (in `localDatabase.ts`) returns the same folder `openLocalDatabase` uses, without opening a database. Deleting with no directory argument looks in `Documents/SQLite` and leaves the file behind.
- Don't use `expo-sqlite/kv-store` or `localStorage` for logged data. They still write to `expo-sqlite`'s default folder, which is backed up.
- A change to the module's Swift needs a new native build.

## Schema changes

`workoutDatabase()` in `../workout/deviceWorkoutStore.ts` opens `compound.db` through the excluded-directory opener and runs `migrations.ts` before returning the connection. All app features share this file.

Add a new file to `migrations/` with a unique stable name, then append its exported migration to the registry in `migrations.ts`. Never edit a migration already shipped. The `local_migrations` table records names; each migration's SQL and ledger entry commit together, or both roll back. Later features own their new tables and migration files.

`workouts` contains an account UUID, a nullable finished timestamp, and a JSON snapshot, validated on read, of the workout and its unfinished input fields. A unique partial index permits one active workout per account. Future sync changes go in their own migration; this ticket sends no workout data to the server.

## Checking it

`compound://dev-device-checks` (dev builds only) creates a database and reports where it opened and whether that folder carries the exclusion flag (`checkLocalDatabaseBackup(db)` only reads the flag, it never sets it). The steps on the iPhone are in the pull request for issue #64.
