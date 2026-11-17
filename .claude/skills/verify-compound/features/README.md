# Compound verification map

The maintained source for verifying Compound's user-facing behaviour. Read this, then the file for each feature the change touches. The harness is `scripts/drive.sh`, which taps and types by label through adb on an Android emulator, as set up by `../SKILL.md`.

## Baseline preconditions

- `bash .claude/skills/verify-compound/scripts/launch.sh` printed `READY:` and `bash .claude/skills/verify-compound/scripts/doctor.sh` passes.
- The database starts empty. Launch signs `$EMAIL` in through the email-code screen, which creates the person, so no other seed data exists or is needed.
- Test person: `verify-<run id>@example.test`, new for each run.
- Evidence goes in `$EVIDENCE_DIR`, as `<feature>-<step>.png` and `<feature>-db.txt`.

## Driving conventions

- Find views by accessibility label or visible text through `drive.sh`, never by coordinates. The handle table is in `../SKILL.md`.
- Start each recipe signed in on the Today tab unless it says otherwise: plain `launch.sh` signs the test person in (`launch.sh --signed-out` is for `sign-in.md`). Sign-out returns to the sign-in screen, so a recipe that signs out runs `bash $D sign-in` before the next one.
- Before each "after" screenshot, `find` a handle only the new screen has (for example `Email address` after tapping `Use an email code instead`). A screenshot taken a fixed time after a tap can still show the old screen.
- Only the Android build is driven here. Everything the Android emulator can't show is an iPhone check, listed in each file's Gotchas.
- Don't tap the Apple button. It can't complete on Android.

## Features

- [Sign-in](./sign-in.md) covers the email-code path through the sign-in screen, the refused code, and sign-out.
- [Profile](./profile.md) covers the time zone and the units setting on the Settings screen.
- [Five-tab shell](./tab-shell.md) covers the Today, Train, Money, Trends and Chat tabs and the Settings screen.
- [Chat button and quick chat](./chat-button.md) covers the draggable button and the Ask Compound sheet it opens.
