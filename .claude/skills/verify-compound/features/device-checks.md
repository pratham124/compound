# Device checks (local database, image cache, network, haptics)

A dev-only screen, `compound://dev-device-checks`, exercises the native modules M2 added to the build: `expo-sqlite` and the `backup-exclusion` module (the local database kept out of iCloud backup), `expo-image` (disk cache), `expo-network` and `expo-haptics`. It is not reachable in a Release build.

## Sub-features

- `device-checks-database` creates `device-check.db` through `openLocalDatabase` and shows its row count and the backup verdict.
- `device-checks-image` loads one remote image, and can load it again with the `disk` cache policy (cached on disk only, not in memory), with the source of each load (`memory`, `disk` or `none`).
- `device-checks-network` shows `online`, `OFFLINE`, or `unknown` before the first network event.
- `device-checks-haptic` taps the haptic engine.

## How to get to it (user POV)

- Only from a dev build: open the deep link `compound://dev-device-checks` while signed in.

## Driving it with drive.sh (adb on an Android emulator)

Preconditions:

- `D=.claude/skills/verify-compound/scripts/drive.sh` and `eval "$(bash $D env)"` are set in the Bash call.
- Launch is `READY` and `$EMAIL` is signed in on the Today tab. The dev client was built from a tree that has the `backup-exclusion` module and `expo-sqlite` (`build-dev-client.sh`; add `--worktree` before the change is merged), or the screen shows a missing native module error.
- Open the screen: `"$ADB" -s emulator-5554 shell am start -a android.intent.action.VIEW -d compound://dev-device-checks com.pratham124.compound`, then `bash $D find "Create database and check backup"`.

- **Database.** Tap `Create database and check backup`. The text reads `database: unsupported on this platform (rows: 1)` and `database at …/SQLite/device-check.db`: Android has no backup-exclusion module, and the database opened in the default folder. Tap again: `rows: 2`, so the file persisted (each tap closes its connection).
- **Image online.** Tap `Load image (online)`. `image: loaded from none (policy memory-disk)` appears, and the picture shows (view `Cache check image`).
- **Image from disk.** Tap `Clear memory cache`, then `Load image (cache on disk only)`. `image: loaded from disk (policy disk)` appears. The `disk` policy keeps the image only in the disk cache, not in memory; it still downloads if the disk has no copy, so the `loaded from` source is what proves where the pixels came from.
- **Network.** The first line reads `network: online`.
- **Image offline.** Run `"$ADB" -s emulator-5554 shell "svc wifi disable; svc data disable"`, then tap `Clear memory cache` and `Load image (online)`. The first line reads `network: OFFLINE (NONE)`, the image still shows and the status reads `loaded from disk (policy memory-disk)`. Turn the network back on with `svc wifi enable; svc data enable`.
- **Image after a cold restart, offline.** Load the image online first. Run `svc wifi disable; svc data disable`, then `bash $D restart` (Metro still answers through `adb reverse`), open the screen again with the `am start` line above, and tap `Load image (online)`. The status reads `loaded from disk (policy memory-disk)` and the first line `network: OFFLINE (NONE)`. Turn the network back on afterwards.

## Check on the iPhone

The Swift module only runs on iOS, and the emulator can't show iOS cache behaviour. Use the development build (`eas build --platform ios --profile development`), because the `device` Release build has no dev screens. On the laptop run `pnpm --filter @compound/mobile start` with the phone on the same Wi-Fi, sign in, and open `compound://dev-device-checks`.

1. **Backup exclusion.** Tap `Create database and check backup`. Pass: `database at …/Library/Application Support/compound-db/device-check.db`, `inside excluded folder: yes`, `rows: 1`. Tap again for `rows: 2`. Fail: `NO`, `unsupported`, or `failed:`.
2. **Image offline, same session.** Tap `Load image (online)` (`loaded from none`). Turn on airplane mode (`network:` flips to `OFFLINE`). Tap `Clear memory cache`, then `Load image (online)`. Pass: the picture shows and the status reads `loaded from disk`.
3. **Image after a cold restart, offline.** With the image already loaded once, force-close the app and reopen it from the dev client with Wi-Fi on (a development build fetches its JavaScript from the laptop at launch). Open the screen, then turn on airplane mode; the Metro disconnect only shows a warning and the loaded JavaScript keeps running. Tap `Clear memory cache`, then `Load image (online)`. Pass: the picture shows, `network:` reads `OFFLINE`, and the status reads `loaded from disk`, which can only be the disk copy that survived the restart.
4. Optional: `Haptic tap` buzzes.

## Gotchas

- Backup exclusion (the Swift module) and the iOS image cache are checked on the iPhone only, as above.
- Haptics can't be felt or seen on the emulator; a tap that throws no error is all it shows.
- The image comes from picsum.photos, so the online step needs the emulator to have internet.
