---
name: verify-compound
description: Drive the Compound iPhone app (Expo, React Native) on an Android emulator against the local stack, sign in a test person, and capture screenshots and database proof. Use when no-mistakes' Test step, or you, need to prove a change to the app or the server's identity module works on screen.
---

# Verify Compound

Compound's real target is an iPhone, and the Mac-only iOS Simulator and the paid EAS cloud simulator are out. So this skill drives the same Expo app as a development build on an Android emulator on the Windows laptop, against the local Docker stack and a server started from this worktree. It reaches everything that is JavaScript, layout and server behaviour. It can't reach the real Apple sign-in sheet, HealthKit, iOS safe areas and Dynamic Type, or how the quick-chat sheet's drag feels. Each feature file lists those under Gotchas as a check on the iPhone. Never report one of them as verified from here.

Run every command from the worktree root in Git Bash. In each Bash call that uses adb, first set `ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"`; it is not on PATH. The helper scripts are in `.claude/skills/verify-compound/scripts/` and find the SDK at `$LOCALAPPDATA/Android/Sdk` themselves (`ANDROID_HOME` is not set on this laptop; the scripts export it). Read `features/README.md` for the baseline and the feature index.

## Launch

```bash
bash .claude/skills/verify-compound/scripts/launch.sh [--signed-out]
```

From an empty database it signs the test person in (pass `--signed-out` to stay on the sign-in screen, which `features/sign-in.md` needs), then ends with a `READY:` line and prints `EVIDENCE_DIR=` and `EMAIL=`. It needs the development build installed on the emulator (see One-time setup below). It does these in order, and `READY` means all of them finished:

If a previous run for this worktree was never cleaned up, Launch refuses to start (`Run <id> was not cleaned up; run cleanup.sh first.`) before it writes anything, so the processes that run left behind can still be found and stopped by Cleanup.

1. `[ -f .env ] || cp .env.example .env`.
2. The local stack, shared by every worktree. If `docker compose ps --status running -q` prints something, the stack is already up: it is used and left running. Otherwise `pnpm stack:up` runs, and Cleanup runs `pnpm stack:down`. If your change touched `compose.yaml` or `infra/local/`, run `pnpm stack:up` yourself first so Compose recreates the changed services.
3. The server, `pnpm --filter @compound/server start`, with output in `$EVIDENCE_DIR/server.log`. It applies migrations before it listens, so `http://localhost:3000/health` answering `"status":"ok"` means the schema exists and Postgres, Valkey and the queue are up. The sign-in code is read from this log, so keep it. Port 3000 must be free: if something this run didn't start owns it, the script stops instead of double-driving it.
4. The emulator `Pixel_5_API_34` (override with `VERIFY_AVD`). If `emulator-5554` is already online it is used and left running.
5. `adb reverse` for the server (3000) and Metro (8082), so the app reaches both as `localhost`. Metro uses 8082, not 8081, so it doesn't collide with the Metro serving Pratham's phone.
6. The app: Metro with `pnpm --filter @compound/mobile start --port 8082`, then the app is cleared (`pm clear`, so a session from an earlier run is gone) and opened with a `compound://expo-development-client/` deep link. If `com.pratham124.compound` isn't installed, Launch stops with exit 1 and prints the one-time setup recipe. Metro runs with `EXPO_PUBLIC_API_URL=http://localhost:3000` set in the shell. `apps/mobile/.env` holds the phone's LAN address and is never edited. A shell variable wins over `.env` in Expo, and the value is baked in when Metro bundles, so Metro must be started with it, which the script does.

Launch dismisses the development client's first-run welcome sheet and developer menu by label (`drive.sh dev-menu`). Ready means `$EVIDENCE_DIR/metro.log` contains `Android Bundled`, the sign-in screen's button was found, and (unless `--signed-out`) `drive.sh sign-in` ended on the Today tab. The sign-in goes through the real email-code screen. That needs no dev-only bypass and no new server code.

### One-time setup: the development build

Launch never builds the app. Building it in a worktree fails on Windows: the NDK's CMake runs `ninja`, and the default CMake 3.22.1 ships ninja 1.10.2, which can't handle the long paths a worktree's pnpm store produces ("The filename or extension is too long" in `configureCMakeDebug` for `react-native-worklets` and `react-native-screens`). `LongPathsEnabled` doesn't help, because the NDK's `clang.exe` isn't long-path aware. In practice both fixes were needed: a short checkout path with the hoisted node linker, and the newer CMake. With only the short path, ninja 1.10 still failed on gesture-handler codegen, and the same happened with hoisted but old ninja. So the development client is built once from a short-path checkout of `origin/main`, installed on the emulator, and every worktree's Launch reuses it. If the app isn't installed, `launch.sh` exits 1 and points here.

Prerequisite: Android SDK CMake 3.31.6 (ninja 1.12.1). Install it in Android Studio under SDK Manager, SDK Tools, Show Package Details. Then, with the emulator booted:

```bash
bash .claude/skills/verify-compound/scripts/build-dev-client.sh
```

It runs what worked by hand:

```bash
git worktree add --detach C:/cb origin/main
cd /c/cb && pnpm install --frozen-lockfile --prefer-offline --node-linker=hoisted   # pnpm 12 ignores --config.node-linker
cd apps/mobile
node ../../node_modules/expo/bin/cli prebuild --platform android --no-install     # every run, so app.json plugin changes reach android/
# android/local.properties must hold:
#   sdk.dir=C:/Users/psito/AppData/Local/Android/Sdk
#   cmake.dir=C:/Users/psito/AppData/Local/Android/Sdk/cmake/3.31.6
ANDROID_HOME="$LOCALAPPDATA/Android/Sdk" ANDROID_SDK_ROOT="$LOCALAPPDATA/Android/Sdk" node ../../node_modules/expo/bin/cli run:android --no-bundler
```

Don't build with `pnpm exec` or `pnpm --filter ... android`: pnpm reinstalls the isolated layout first and undoes the hoisted install. To refresh, run the script again; it fetches, moves C:/cb to `origin/main` and rebuilds.

Rebuild the client whenever a change adds or upgrades a native module, meaning anything that changes the `android/` prebuild output: a new `expo-*` or `react-native-*` package with native code, or a change to the `app.json` plugins. A stale client fails at run time with a missing native module, and from a worktree you can't build a new one: tell Pratham to refresh it. JavaScript-only changes need no rebuild, because Metro serves the worktree's code.
`depends.txt` beside this file lists the repo files these sections and the scripts depend on; the `verification-sync` gate fails when one changes and nothing in this skill outside `features/` does, so update this file and the scripts with it (or say `No verification update:` in a commit).

## Doctor

```bash
bash .claude/skills/verify-compound/scripts/doctor.sh
```

Read-only. Prints `ok` or `FAIL` for each check and exits 1 on any failure: the run belongs to this worktree (its recorded path equals `git rev-parse --show-toplevel`), the stack is running, the processes on :3000 and :8082 are the PIDs `launch.sh` recorded, `/health` is ok, Metro reports running, the emulator is online, `adb reverse` is set, Compound is installed and in the foreground. Run it before driving and whenever a screen looks wrong. On a FAIL, run Cleanup and Launch again rather than patching one piece.

## Drive

Drive with `scripts/drive.sh`, which uses adb and uiautomator, so it needs nothing beyond what Launch started. Expo MCP is not used: its local automation needs the `expo-mcp` dev dependency, an unstable flag on Metro, a matching `expo login` and a manual reconnect after every dev-server start, so a headless Test step can't rely on it.

```bash
D=.claude/skills/verify-compound/scripts/drive.sh
eval "$(bash $D env)"   # sets EVIDENCE_DIR, EMAIL, ADB; repeat both lines in every Bash call
bash $D tap "Use an email code instead"
```

| Subcommand | Does |
|---|---|
| `find "<label>"` | prints the view's bounds; exit 1 if it never appears |
| `absent "<label>"` | exit 0 once the view is gone, exit 1 if it is still there (use it for "hidden" checks) |
| `tap "<label>"` | taps the centre of the view |
| `type "<label>" "<text>"` | taps the field, then types. Only letters, digits and `@ . _ , : / + = -` and spaces; anything else is refused, not mangled |
| `clear "<label>"` | taps the field and deletes its text (up to 40 characters) |
| `drag "<label>" left\|right` | swipes the view to that screen edge (600 ms) |
| `key back\|enter` | presses a system key |
| `dev-menu` | dismisses the development client's welcome sheet (`Continue`) and developer menu (`Close`) if showing, then waits up to 60 s for the app's first screen |
| `restart` | force-stops the app, opens it again, and waits up to 60 s (`DRIVE_RESTART_WAIT`) for its first screen, dismissing those overlays, so the next `find` needn't race the reload |
| `code` | prints the latest sign-in code the server logged for `$EMAIL` |
| `screenshot <name>` | saves `$EVIDENCE_DIR/<name>.png` |
| `dump <name>` | saves the view tree as `$EVIDENCE_DIR/<name>.xml` |

Always find views by label through `drive.sh`, and never tap a hard-coded coordinate. If a label isn't in the view tree, report that (and `dump` the tree as evidence) instead of guessing a position. A label matches the view's `accessibilityLabel` or its visible text, exactly. `testID` is not visible to adb. Views are polled for 8 seconds because screens animate; set `DRIVE_WAIT` to change it. The first match wins, so a label shared by two views (`Ask Compound` is both the chat button and the sheet header) finds whichever comes first in the tree. Every action is also appended to `$EVIDENCE_DIR/drive.log`.

The handles that exist in this repo:

| Handle | Where | Source |
|---|---|---|
| `Use an email code instead` | sign-in screen button | `apps/mobile/app/sign-in.tsx` |
| `Email address` (text field), `Send code` | email step | `apps/mobile/app/email-code.tsx` |
| `Sign-in code` (text field), `Sign in` | code step | `apps/mobile/app/email-code.tsx` |
| `Today`, `Train`, `Money`, `Trends`, `Chat` | tab labels | `apps/mobile/src/navigation/tabs.ts` |
| `Settings` | button on the Today tab, opens settings | `apps/mobile/src/components/ProfileButton.tsx` |
| `Units` (radio group), radios `kg` and `lb` | settings | `apps/mobile/src/components/ProfileCard.tsx` |
| `Time Zone` row | settings | `apps/mobile/src/components/ProfileCard.tsx` |
| `Sign out` | settings | `apps/mobile/src/components/SignOutGroup.tsx` |
| `Ask Compound` | the draggable chat button | `apps/mobile/src/theme/tokens.ts` |
| `Ask Compound` (header), `Close` | quick-chat sheet | `apps/mobile/src/chatButton/QuickChatHeader.tsx` |

Launch signs the test person in with `bash $D sign-in` (also the way back in after a recipe signs out). It is these steps, through the real email-code screens:

```bash
bash $D tap "Use an email code instead"
bash $D find "Email address"
bash $D type "Email address" "$EMAIL"
bash $D tap "Send code"
bash $D find "Sign-in code"
bash $D type "Sign-in code" "$(bash $D code)"
bash $D tap "Sign in"
bash $D find "Today"
```

`code` reads the server log, where the console mailer prints the code and where it appears nowhere else. The Today tab is up once `find "Today"` succeeds.

`$EMAIL` is unique per run (`verify-<run id>@example.test`), so the Valkey rate limit and users left by earlier runs can't interfere. Don't reuse an address: five wrong codes or too many sends lock it for a minute.

The email-code screen is the path a person without Apple takes, so it is the real user path, not a bypass. The Apple button can't complete on Android and must not be tapped. Drive the feature files for what the change touches, from `features/README.md`.

## Evidence

Everything goes in `$EVIDENCE_DIR` (`$HOME/compound-verify-evidence/<run id>/`), which is outside the repo and outside the worktree, so Cleanup and `git worktree remove` both leave it alone. Override the root with `VERIFY_EVIDENCE_ROOT`.

- Screenshots: `bash $D screenshot <feature>-<step>`, which writes `$EVIDENCE_DIR/<feature>-<step>.png`. When a screen's text matters, also `bash $D dump <feature>-<step>` to keep the view tree beside it.
- Capture the action and the result: a screenshot before and after each tap that changes state, not only the final screen. Before each "after" screenshot, `find` a handle that only the new screen has (`Email address` after `Use an email code instead`, `About: Money` after opening the sheet). A screenshot a fixed time after a tap can still show the old screen.
- Verify side effects in the database as well as on screen, as the owner role:
  ```bash
  docker compose exec -T postgres psql -U compound -d compound -c "select u.email, p.units, p.time_zone, p.time_zone_is_fallback from users u left join user_profiles p on p.user_id = u.id where u.email = '$EMAIL'" | tee "$EVIDENCE_DIR/<feature>-db.txt"
  ```
- The profile row is created only when Settings first loads (the first `GET /me/profile`), so a query on it right after sign-in returns no profile columns: `left join` shows the user with nulls, and the row appears once Settings has opened.
- Keep `server.log` and `metro.log` in the folder. They show the request that the tap caused.
- Proof standard: exercise the real user path. Don't call the API with curl in place of a tap, don't edit rows to set up a state, and don't mock the server. Seeing the new value on screen after the app restarts (`bash $D restart`) proves it was stored, not just held in state.
- Say which Gotchas items you did not and could not check, and name them as iPhone checks.

## Cleanup

```bash
bash .claude/skills/verify-compound/scripts/cleanup.sh
```

Stops only what `launch.sh` recorded, never by process name: the server and Metro by the PIDs it saved (and only if that PID still owns the port), the emulator only if this run booted it (otherwise it just force-stops the app), the stack only if this run brought it up. The `adb reverse` rules are removed. Evidence in `$EVIDENCE_DIR` is not touched.

The test person stays in the local database: `docker compose down` keeps the Postgres volume, and a unique `example.test` address collides with nothing. To remove them, which also deletes the profile row through the foreign key:

```bash
docker compose exec -T postgres psql -U compound -d compound -c "delete from users where email like 'verify-%@example.test'"
```

If Launch fails partway, run Cleanup before launching again: Launch records the processes it started before it exits, and Cleanup copes with whatever is missing.
