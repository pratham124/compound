---
name: verify-compound
description: Drive the Compound Expo app on an Android emulator with Maestro against the local stack, capture screenshots under $EVIDENCE_DIR, and verify database state. Use when /ship's live-driving step or manual verification needs on-screen and database proof for an app or identity change.
---

# Verify Compound

Compound targets iPhone, where the iOS Simulator is Mac-only and EAS cloud simulators are paid. This skill drives the same Expo JavaScript app as an Android development build on the Windows laptop's emulator against the local Docker stack and this worktree's server. Android proves JavaScript, layout, local SQLite, image caching, and server behaviour; it never proves Apple sign-in, HealthKit, iOS Keychain, iCloud backup exclusion, iOS safe areas, Dynamic Type, VoiceOver, or gesture haptics. Never report an iPhone-only item from a feature file's Gotchas section as verified from Android; list it as an unverified iPhone check instead.

Run every command from the worktree root in Git Bash. The scripts in `.claude/skills/verify-compound/scripts/` export `ANDROID_HOME="$LOCALAPPDATA/Android/Sdk"`, prepend `$ANDROID_HOME/platform-tools` to `PATH`, and locate Maestro automatically. Read `features/README.md` for the feature index.

## One-time setup

Two prerequisites live outside the repo and are installed once per laptop.

### 1. Maestro CLI (Windows)

Maestro keeps a persistent accessibility driver running on the emulator, which avoids per-action `uiautomator` dumps and drives screens with live animations (including the 1-second workout clock).

1. Install **Java 17+** (required by Maestro's JVM) and confirm `java -version` prints `17` or higher.
2. Download `maestro.zip` from the latest [Maestro GitHub Release](https://github.com/mobile-dev-inc/Maestro/releases) and extract it to `C:\maestro`.
3. Add `C:\maestro\bin` to your Windows User `PATH` (`setx PATH "%PATH%;C:\maestro\bin"` in PowerShell, then open a new terminal).
4. Confirm `/c/maestro/bin/maestro --version` prints the installed version in Git Bash.

`lib.sh` exports `MAESTRO_CLI_NO_ANALYTICS=1` and `MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true`, and passes `--no-reinstall-driver` once `dev.mobile.maestro` is present on the emulator so repeat runs skip reinstalling the driver APKs.

### 2. Android development build

Launch never builds the native client. Building inside a worktree fails on Windows because the NDK's CMake/ninja 1.10 hits Windows path limits on pnpm's nested store layout (`LongPathsEnabled` does not fix `clang.exe`). Install **Android SDK CMake 3.31.6** (ninja 1.12.1) in Android Studio -> SDK Manager -> SDK Tools -> Show Package Details, boot the emulator, and run:

| Condition | Action |
|---|---|
| `com.pratham124.compound` is missing or `origin/main` changed native code | `bash .claude/skills/verify-compound/scripts/build-dev-client.sh` (builds from `C:/cb` at `origin/main`) |
| Current worktree added/upgraded a native module or `app.json` plugin not yet on `origin/main` | `bash .claude/skills/verify-compound/scripts/build-dev-client.sh --worktree` |
| JavaScript-only changes (default) | Do not rebuild; Metro serves this worktree's bundle |

Never build with `pnpm exec` or `pnpm --filter ... android`, because pnpm restores the isolated store layout and breaks CMake paths; always use `build-dev-client.sh`. Never edit `C:/cb` by hand because the script resets it on plain runs.

### 3. Emulator snapshot

Launch boots the AVD from its `default_boot` snapshot. Save one after the Maestro driver APKs (`dev.mobile.maestro`, `dev.mobile.maestro.test`) are installed, so a cold Launch skips the ~50 s driver reinstall. Redo this when the AVD is recreated:

1. Run `launch.sh --signed-out` once, so the snapshot holds no session or drafts. (Don't `pm clear` before saving: that brings the dev client's welcome sheet back.)
2. `adb emu avd snapshot save default_boot` (about 10 s; the snapshot is a ~1.2 GB file under the AVD folder, not in the repo).

Cleanup's emulator kill does not touch it, because Launch boots with `-no-snapshot-save`.

## Launch

```bash
bash .claude/skills/verify-compound/scripts/launch.sh [--signed-out]
```

| Feature to drive | Command |
|---|---|
| `sign-in` (must start on the signed-out landing screen) | `bash .claude/skills/verify-compound/scripts/launch.sh --signed-out` |
| Every other feature (default) | `bash .claude/skills/verify-compound/scripts/launch.sh` |

Launch refuses to start if a previous run for this worktree left a pointer file (`Run <id> was not cleaned up; run cleanup.sh first.`), so orphaned PIDs can still be stopped by Cleanup. Always run `cleanup.sh` before re-launching after any failure.

Launch runs these steps, overlapping emulator boot, stack/server startup, and Metro startup to minimize wall-clock time:

1. Copies `.env.example` to `.env` if `.env` is missing.
2. Starts emulator `Pixel_5_API_34` (override with `VERIFY_AVD`) from its `default_boot` snapshot (`-snapshot default_boot -no-snapshot-save -no-boot-anim -no-audio`) if `emulator-5554` is not already online. Reuses an already-online emulator (`EMULATOR_STARTED=0`).
3. Starts the shared local stack (`pnpm stack:up`) only if `docker compose ps --status running -q` is empty (`STACK_STARTED=1`); otherwise reuses it (`STACK_STARTED=0`). If the change touched `compose.yaml` or `infra/local/`, run `pnpm stack:up` yourself first so Compose recreates changed services.
4. Starts `pnpm --filter @compound/server start` on `:3000` (migrations run before listening; `/health` returning `"status":"ok"` proves schema, Postgres, Valkey, and queue are ready). Fails if `:3000` is already taken so it never double-drives another server.
5. Handles Metro on `:8082` (never `:8081`, which serves Pratham's phone) according to this table:

| State of port `:8082` | Action |
|---|---|
| Running, `/status` ok, and `$EVIDENCE_ROOT/metro-8082.env` matches PID, this worktree, and `http://localhost:3000` | Reuse it (`METRO_STARTED=0`) |
| Taken by another process or another worktree | Exit 1 without starting Metro |
| Free (default) | Start Metro with `EXPO_PUBLIC_API_URL=http://localhost:3000` (`METRO_STARTED=1`), write `metro-8082.env`, and pre-warm the Android bundle in the background while the emulator finishes booting |

Never edit `apps/mobile/.env` (it holds the phone's LAN URL); the shell variable overrides `.env` when Metro bundles.

6. Maps `adb reverse` for `:3000` and `:8082`, verifies `com.pratham124.compound` is installed, resets the app's session and local databases with `run-as` (SecureStore, `files/SQLite`, AsyncStorage's `RKStorage`, the Expo Image disk cache), so every run starts signed out with no data from an earlier one but keeps the dev client's own preferences and skips its welcome sheet, and runs Maestro `flows/_boot-ready.yaml` to open the dev-client deep link, dismiss the welcome sheet (`Continue`) and developer menu (`Reload` + `Close`), and wait for the app's first screen.
7. Unless `--signed-out`, signs in a fresh test person (`verify-<run id>@example.test`) through the real email-code screen (`flows/_sign-in-request.yaml` -> reads the 6-digit code logged by the console mailer in `$EVIDENCE_DIR/server.log` -> `flows/_sign-in-verify.yaml` ending on `Today`). Never reuse an email address because five failed attempts or rapid sends trigger Valkey rate limits and prevent proving new-user creation.

Launch ends by printing `READY:`, `EVIDENCE_DIR=...`, and `EMAIL=...`.

## Doctor

```bash
bash .claude/skills/verify-compound/scripts/doctor.sh
```

Read-only. Verifies the run belongs to this worktree, Maestro CLI is installed, the stack is running, the processes on `:3000` and `:8082` match the recorded PIDs, `/health` and Metro `/status` are healthy, the emulator is online, `adb reverse` maps `:3000`, and Compound is installed and focused.

| Doctor result | Action |
|---|---|
| Exit 0 (`DOCTOR: healthy`) (default) | Proceed to Drive |
| Exit 1 (`DOCTOR: not healthy`) | Run `cleanup.sh`, then `launch.sh` again; never patch individual pieces by hand |

## Drive

Run each touched feature's Maestro flow in one command:

```bash
bash .claude/skills/verify-compound/scripts/run-flow.sh [--deep] <feature>...
```

Several features run in order on the current Launch, returning to Today before each, so one Launch covers a whole diff: `run-flow.sh workouts exercises`. A failing feature does not stop the rest; the exit code is non-zero if any failed, and a `PASS`/`FAIL` line with the time per feature closes the output.

A feature that fails is rerun once on the same Launch after `_to-today`, with its retry logs and screenshots suffixed `-retry`. If the retry passes, the summary line is `FLAKY <feature> <first>s then <retry>s` and the run still exits 0; if it fails again the line is `FAIL <feature> ...` and the exit is non-zero. Report FLAKY flows (the retry hides real flakiness) but do not stop for them. `RUN_FLOW_RETRY=0` turns the retry off. A flow that signs the test person out (`tab-shell`, `sign-in`) leaves the next flow signed out, so run it last or relaunch; its retry then cannot pass either.

`--deep` also runs each feature's `flows/<feature>-deep.yaml` after its base flow. These hold the slow durability steps (app restarts, offline recovery) and exist for `workouts` and `exercises`. Use `--deep` when the diff touches the paths named in that feature file's "Deep flow" line, and at milestone end for every feature.

`<feature>` matches a file under `.claude/skills/verify-compound/flows/<feature>.yaml`: `workouts`, `workouts-fixtures`, `sign-in`, `tab-shell`, `profile`, `chat-button`, `exercises`, or `device-checks`; `workouts` and `exercises` also have `<feature>-deep`. `workouts-fixtures` is the worst-case-data and large-text pass: run it when the diff touches the paths in that line of `features/workouts.md`, and at milestone end.

`run-flow.sh`:
- Writes Maestro's output to `$EVIDENCE_DIR/<feature>-maestro.log` and artifacts to `$EVIDENCE_DIR/maestro-<feature>/`.
- Copies every explicit `takeScreenshot` PNG directly to `$EVIDENCE_DIR/<name>.png` (excluding Maestro's internal `step-*.png` debug captures).
- For features with host-side transitions (`workouts`, `exercises`, `device-checks`, `sign-in`), orchestrates the phases, toggles `adb reverse --remove tcp:3000`, `svc wifi/data disable`, and `settings put system font_scale 2.0` between phases, and restores all three in an `EXIT` trap even if a phase fails.
- Exits non-zero on any failed assertion, missing flow or failing feature.

Every flow starts with `flows/_park-tools.yaml`, which parks expo-dev-client's floating `Tools` gear on the left edge at about y=1400 of 2340, where no screen has controls or titles. Never park `Tools` manually.

### Rules for flows and handles

- Always select app controls by `accessibilityLabel` or visible text. Never tap hard-coded screen coordinates for app controls; if a label is missing from the view tree, fail and report the missing handle rather than guessing a position. (Relative `point` inside a matched element — such as `point: "90%, 50%"` on a `TextInput` to place the cursor at the end of existing text — is allowed because the element itself is still selected by label.)
- Never pause, mock, or fake the workout clock; inside the active workout logger, set `waitToSettleTimeoutMs: 250` and `retryTapIfNoChange: false` on `tapOn` commands so Maestro does not wait on the 1-second stopwatch tick.
- Never call `hideKeyboard` in flows on `Pixel_5_API_34`: the AVD has `hw.keyboard = yes`, so no soft keyboard opens and `hideKeyboard` sends `KEYCODE_BACK`, closing modals.
- Never tap the Sign in with Apple button; `expo-apple-authentication` cannot complete on Android.

Core handles in this repo:

| Handle | Where | Source |
|---|---|---|
| `Use an email code instead` | sign-in screen button | `apps/mobile/app/sign-in.tsx` |
| `Email address`, `Send code`, `Sign-in code`, `Sign in` | email-code steps | `apps/mobile/app/email-code.tsx` |
| `Today`, `Train`, `Money`, `Trends`, `Chat` | tab bar labels | `apps/mobile/src/navigation/tabs.ts` |
| `Settings`, `Units`, `kg`, `lb`, `Time Zone`, `Sign out` | settings screen | `apps/mobile/src/components/` |
| `Search exercises`, `Exercises` | Train and catalogue | `apps/mobile/src/exercises/` |
| `Start workout`, `Add exercise`, `Finish`, `Workout done`, `Done` | workout logger & summary | `apps/mobile/src/workout/` |
| `Set N reps`, `Set N weight in lb\|kg`, `Set N done`, `Add set to <name>`, `More for <name>` | workout set rows & card | `apps/mobile/src/workout/` |
| `Ask Compound`, `Close` | chat button & quick-chat sheet | `apps/mobile/src/chatButton/` |

`scripts/drive.sh` has two subcommands, `env` and `code`. `env` loads `EVIDENCE_DIR`, `EMAIL`, and `ADB` into shell commands for post-flow database checks; `code` prints the sign-in code the server logged for `EMAIL`:

```bash
eval "$(bash .claude/skills/verify-compound/scripts/drive.sh env)"
```

## Evidence

All evidence lives in `$EVIDENCE_DIR` (`$HOME/compound-verify-evidence/<run id>/`, override with `VERIFY_EVIDENCE_ROOT`), outside the repo and worktree so Cleanup and `git worktree remove` preserve it.

- **Screenshots:** Inspect every `$EVIDENCE_DIR/<feature>-<step>.png` captured by `run-flow.sh` (a passing label assertion does not prove image pixels loaded or layout remained intact at `font_scale 2.0`).
- **Logs:** Keep `server.log`, `metro.log`, `launch-maestro.log`, and `<feature>-maestro.log` in `$EVIDENCE_DIR`.
- **Database checks (shell step after the flow):** Verify real server rows as the owner role:
  ```bash
  eval "$(bash .claude/skills/verify-compound/scripts/drive.sh env)"
  docker compose exec -T postgres psql -U compound -d compound -c "select u.email, p.units, p.time_zone, p.time_zone_is_fallback from users u left join user_profiles p on p.user_id = u.id where u.email = '$EMAIL'" | tee "$EVIDENCE_DIR/<feature>-db.txt"
  ```
  The profile row is created lazily on the first `GET /me/profile` when Settings opens, so right after sign-in the `left join` shows null profile columns until Settings loads.
- **Local SQLite check (workouts):** Copy `compound.db`, `compound.db-wal`, and `compound.db-shm` via `adb exec-out run-as com.pratham124.compound cat files/SQLite/<file>` into `$EVIDENCE_DIR` and query the copy read-only. Never modify database rows or call APIs with `curl` to fabricate state.
- **iPhone checks:** Explicitly list every unchecked item from the driven feature files' Gotchas section as an iPhone-only check.

## Cleanup

```bash
bash .claude/skills/verify-compound/scripts/cleanup.sh [--keep-metro]
```

| Situation | Command |
|---|---|
| Driving another run in the same worktree immediately after | `bash .claude/skills/verify-compound/scripts/cleanup.sh --keep-metro` (leaves `:8082` warm for the next Launch) |
| Done verifying (default) | `bash .claude/skills/verify-compound/scripts/cleanup.sh` (stops every process Launch started) |

Cleanup waits (up to `EMU_KILL_WAIT`, default 30 s) for the emulator to leave `adb devices` after `emu kill`, so a Launch right after it boots a fresh one. Cleanup stops only what `launch.sh` recorded, and only if the recorded PID still owns its port: the server, Metro (when `METRO_STARTED=1` and `--keep-metro` is not passed), the emulator (when `EMULATOR_STARTED=1`; otherwise force-stops only Compound), and the stack (when `STACK_STARTED=1`). It removes the `adb reverse` rules and the worktree pointer while leaving `$EVIDENCE_DIR` untouched.

Test users stay in Postgres under `verify-%@example.test` because unique addresses never collide. To delete them (which cascades to `user_profiles`), run:

```bash
docker compose exec -T postgres psql -U compound -d compound -c "delete from users where email like 'verify-%@example.test'"
```

`depends.txt` beside this file lists the repo files Launch, Doctor, and the flows depend on; the `verification-sync` gate fails when one changes without an update outside `features/` (or a `No verification update: <reason>` commit line).
