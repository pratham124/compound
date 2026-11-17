# Profile (time zone and units)

Each person has a profile with a time zone and a unit system for weights. The phone's time zone is stored the first time the profile loads. The person can switch units between kg and lb on the Settings screen, and the choice is kept on the server.

## Sub-features

- `profile-create` creates the profile on first load, with the phone's time zone and metric units.
- `profile-timezone` shows the stored time zone on the `Time Zone` row, with underscores shown as spaces.
- `profile-units` switches `kg` and `lb` and stores the choice.
- `profile-save-failed` shows `Couldn't save that. Check your connection and try again.` when the save fails.
- `profile-load-failed` shows `Couldn't load your profile. Check your connection and try again.` with `Try again`.

## How to get to it (user POV)

- Signed in, tap `Settings` on the Today tab. The profile group shows the `Units` and `Time Zone` rows.

## Driving it with drive.sh (adb on an Android emulator)

Preconditions:

- `D=.claude/skills/verify-compound/scripts/drive.sh` and `eval "$(bash $D env)"` are set in the Bash call. Each step below is `bash $D tap|type|find|absent "<label>"`, as `../SKILL.md` describes; a label that never appears is reported, not worked around.

- Launch is `READY`, Doctor passes, and `$EMAIL` is signed in on the Today tab (see `sign-in.md`).
- The person has no profile row yet, because nothing has opened Settings in this run.

- **Open Settings.** Tap `Settings`. The title reads `Settings`, the profile group shows the signed-in email, and `Loading your profile…` is replaced by the `Units` and `Time Zone` rows.
- **Profile created.** The row is created lazily, by the first `GET /me/profile`, and only Settings makes that request, so it doesn't exist after sign-in or on the Today tab. Once Settings has loaded, check the database: `select p.time_zone, p.units, p.time_zone_is_fallback from users u join user_profiles p on p.user_id = u.id where u.email = '$EMAIL'` returns one row with `units` `metric`. The `Time Zone` row on screen shows the same zone as `time_zone`, with underscores shown as spaces.
- **Switch to lb.** Tap the radio `lb` in the `Units` group. It becomes selected at once. Re-run the query: `units` is `imperial`.
- **Kept after restart.** Run `bash $D restart`, open Settings again. `lb` is selected, not `kg`.
- **Switch back.** Tap `kg`. The query returns `metric`.
- **Load failure (optional, ends the run's usable state).** Stop only this run's server with `taskkill //PID <SERVER_PID from state.env> //T //F`, reopen Settings, and the `Try again` message appears. Run Cleanup afterwards.

## Gotchas

- `time_zone_is_fallback` is true only when the phone didn't report a zone and UTC stood in; on the emulator it should be false. If true, the zone read failed, and that is a finding.
- Check on the iPhone: the zone the real phone reports, since the emulator's zone is whatever the AVD was created with. Also the row layout at the largest Dynamic Type size, where the zone drops under its label.
- The `Units` control animates its thumb. A screenshot taken mid-slide can show it between the two options: wait for the next frame before capturing.
- Units only change what is stored for now. Nothing else on screen uses them yet, so the database row is the proof.
