# Compound verification map

The maintained source for verifying Compound's user-facing behaviour. Read this, then the file for each feature the change touches. The harness is Maestro (`flows/<feature>.yaml`), executed via `scripts/run-flow.sh <feature>` against the Android emulator started by `../SKILL.md`.

## Baseline preconditions

- `bash .claude/skills/verify-compound/scripts/launch.sh` printed `READY:` and `bash .claude/skills/verify-compound/scripts/doctor.sh` passes.
- The database starts empty. Launch signs `$EMAIL` in through the email-code screen via Maestro, which creates the person, so no other seed data exists or is needed.
- Test person: `verify-<run id>@example.test`, new for each run.
- Evidence goes in `$EVIDENCE_DIR`, as `<feature>-<step>.png`, `<feature>-maestro.log`, and `<feature>-db.txt`.

## Driving conventions

- Run each feature with `bash .claude/skills/verify-compound/scripts/run-flow.sh <feature>`. Flows select app controls by accessibility label or visible text, never hard-coded coordinates. The handle table is in `../SKILL.md`.
- Every flow parks expo-dev-client's floating `Tools` gear on the left edge at the start (`flows/_park-tools.yaml`).
- Start each flow signed in on the Today tab unless it says otherwise: plain `launch.sh` signs the test person in (`launch.sh --signed-out` is for `sign-in.md`). Flows that sign out (`sign-in`, `tab-shell`) end signed out, so run Cleanup and Launch again before another signed-in flow.
- Database checks (`psql` or `run-as ... compound.db`) stay as shell steps right after `run-flow.sh` finishes; get `$EVIDENCE_DIR`, `$EMAIL`, and `$ADB` with `eval "$(bash .claude/skills/verify-compound/scripts/drive.sh env)"`.
- Only the Android build is driven here. Everything the Android emulator can't show is an iPhone check, listed in each file's Gotchas.
- Never tap the Apple button; it can't complete on Android.

## Features

- [Sign-in](./sign-in.md) (`flows/sign-in.yaml`) covers the email-code path through the sign-in screen, the refused code, and sign-out.
- [Profile](./profile.md) (`flows/profile.yaml`) covers the time zone and the units setting on the Settings screen.
- [Five-tab shell](./tab-shell.md) (`flows/tab-shell.yaml`) covers the Today, Train, Money, Trends and Chat tabs and the Settings screen.
- [Device checks](./device-checks.md) (`flows/device-checks.yaml`) covers the dev-only screen for the local database, image cache, network state and haptics that M2's native build added.
- [Exercise catalogue](./exercises.md) (`flows/exercises.yaml`) covers offline browsing/search from Train, instructions, cached pictures and the release-build iPhone check.
- [Offline workout logger](./workouts.md) (`flows/workouts.yaml`) covers Train sections, account-scoped local drafts, sets, units, swipe-delete, restart recovery, workout completion and hidden chat.
- [Chat button and quick chat](./chat-button.md) (`flows/chat-button.yaml`) covers the draggable button and the Ask Compound sheet it opens.
