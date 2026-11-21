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

## Driving it with Maestro (`flows/profile.yaml`)

Preconditions:

- Launch is `READY`, Doctor passes, and `$EMAIL` is signed in on the Today tab (with no profile row yet because Settings has not opened).
- Run `bash .claude/skills/verify-compound/scripts/run-flow.sh profile`.

Steps covered by `flows/profile.yaml`:

- **Open Settings.** Parks `Tools`, taps `Settings`, confirms `Units`, `Time Zone`, and `$EMAIL` appear, and captures `profile-settings-metric`.
- **Switch to lb.** Taps `lb` in the `Units` group and captures `profile-settings-imperial`.
- **Kept after restart.** Force-stops and relaunches the app (`stopApp` + `launchApp`), reopens `Settings`, and captures `profile-reopened-imperial` (`lb` still selected).
- **Switch back.** Taps `kg` and captures `profile-settings-metric-restored`.

Database check after the flow (`eval "$(bash .claude/skills/verify-compound/scripts/drive.sh env)"`):

```bash
docker compose exec -T postgres psql -U compound -d compound -c "select p.time_zone, p.units, p.time_zone_is_fallback from users u join user_profiles p on p.user_id = u.id where u.email = '$EMAIL'" | tee "$EVIDENCE_DIR/profile-db.txt"
```

Confirm one row exists with `units` = `metric` (after switching back), `time_zone_is_fallback` = `f`, and `time_zone` matching the `Time Zone` row in the screenshots (underscores shown as spaces).

- **Load failure (optional, ends the run's usable state).** Stop only this run's server with `taskkill //PID <SERVER_PID from state.env> //T //F`, reopen Settings, and confirm `Try again` appears. Run Cleanup afterwards.

## Gotchas

- `time_zone_is_fallback` is true only when the phone didn't report a zone and UTC stood in; on the emulator it should be false. If true, the zone read failed, and that is a finding.
- Check on the iPhone: the zone the real phone reports, since the emulator's zone is whatever the AVD was created with. Also the row layout at the largest Dynamic Type size, where the zone drops under its label.
- The `Units` control animates its thumb. A screenshot taken mid-slide can show it between the two options: wait for the next frame before capturing.
- Units only change what is stored for now. Nothing else on screen uses them yet, so the database row is the proof.
