# Device checks (local database, image cache, network, haptics)

A dev-only screen, `compound://dev-device-checks`, exercises the native modules M2 added to the build: `expo-sqlite` and the `backup-exclusion` module (the local database kept out of iCloud backup), `expo-image` (disk cache), `expo-network` and `expo-haptics`. It is not reachable in a Release build.

## Sub-features

- `device-checks-database` creates `device-check.db` through `openLocalDatabase` and shows its row count and the backup verdict.
- `device-checks-image` loads one remote image, and can load it again with the `disk` cache policy (cached on disk only, not in memory), with the source of each load (`memory`, `disk` or `none`).
- `device-checks-network` shows `online`, `OFFLINE`, or `unknown` before the first network event.
- `device-checks-haptic` taps the haptic engine.

## How to get to it (user POV)

- Only from a dev build: open the deep link `compound://dev-device-checks` while signed in.

## Driving it with Maestro (`flows/device-checks.yaml`)

Preconditions:

- Launch is `READY`, Doctor passes, and `$EMAIL` is signed in on the Today tab. The dev client was built from a tree that has the `backup-exclusion` module and `expo-sqlite` (`build-dev-client.sh`; add `--worktree` before the change is merged), or the screen shows a missing native module error.
- Run `bash .claude/skills/verify-compound/scripts/run-flow.sh device-checks`. It runs the `online` phase, disables emulator Wi-Fi/data, runs the `offline` phase (including cold restart), and restores Wi-Fi/data on exit even on failure.

Steps covered by `flows/device-checks.yaml`:

- **Database.** Opens `compound://dev-device-checks`, taps `Create database and check backup` twice, confirms `rows: 1` then `rows: 2` (`unsupported on this platform` on Android), and captures `device-checks-database`.
- **Haptic.** Taps `Haptic tap` and confirms no error.
- **Image online.** Taps `Load image (online)`, confirms `loaded from none (policy memory-disk)` and `Cache check image`, and captures `device-checks-image-online`.
- **Image from disk.** Taps `Clear memory cache`, confirms `memory cache cleared: true`, taps `Load image (cache on disk only)`, confirms `loaded from disk (policy disk)`, and captures `device-checks-image-disk`.
- **Network & image offline.** After `run-flow.sh` disables Wi-Fi and data, confirms `network: OFFLINE`, taps `Clear memory cache` and `Load image (online)`, confirms `loaded from disk (policy memory-disk)`, and captures `device-checks-image-offline`.
- **Image after cold restart, offline.** Force-stops and relaunches (`stopApp` + `launchApp` while Metro `:8082` reverse stays up), reopens `compound://dev-device-checks`, confirms `network: OFFLINE`, taps `Load image (online)`, confirms `loaded from disk (policy memory-disk)`, and captures `device-checks-image-offline-reopened`.

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
