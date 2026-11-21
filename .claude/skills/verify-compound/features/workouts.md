# Offline workout logger

## Sub-features

- Start a workout from Train (Start workout), add bundled exercises, enter reps and optional weight, check each completed set, and finish without the API.
- Save every draft edit to the account's workout in `compound.db`, including unfinished number fields. A saved draft restores on Train after force-stop.
- Keep rejected draft edits available for retry after returning to Train. Refocus reads cannot overwrite newer edits; a failed Finish keeps the logger active.
- Cache successful Settings unit reads and saves per account. The local write is best-effort: if it fails, Settings still shows the server's answer instead of an error. Enter/display kg or lb and retain the original unit on each set. Existing weights convert for display after a Settings change.
- Cancel a previous account's profile refresh before reading current credentials or writing its local preference. Converted weights show to the nearest 0.5 (10 kg → 22 lb, 22 lb → 10 kg) while keeping the stored units.
- Finish waits for queued input writes, persists the finished snapshot, then shows Workout done with elapsed minutes and completed set count.
- The finished summary fades in over 180 ms with the shared ease-out, with no translation or scale; the fade remains under Reduce Motion.
- The elapsed clock updates seconds in its own component, without rerendering exercise inputs. Long durations use hours:minutes:seconds; the header wraps and stacks at larger text sizes.
- The logger owns its top safe-area inset, so the fixed Finish header stays below the iPhone status area. Native scroll insets handle the tab bar, and platform keyboard avoidance keeps the numeric fields reachable.
- Exercise cards use one Set / Last time / unit / Reps header, compact number fields, 28-point check circles in 44-point targets, a short Add set label and an outlined Add exercise control. Last-time placeholders are dashes until history is implemented; larger text moves that column beneath each row.
- Train shows five separate placeholder sections: Next day (the reviewed No routines yet card), Past workouts (This week, which says finished workouts aren't shown yet), Routines (holding the Start workout row), Personal records (not tracked yet) and Exercise list (All exercises). Workout done plays the MochiFlex animation (flex, pumps, sweat drop; fade-only under Reduce Motion) beside its title, shows the workout date as the subtitle (with the year only when it isn't the current year), and shows Time (for example "1 h 35 min") and Sets as grouped key-value rows.
- Swipe a set row left to reveal a rounded Delete pill; past half the row width the pill fills red with a haptic. Where the finger lets go decides: past half deletes the set and slides the row off (a fade under Reduce Motion), short of half leaves the Delete pill open, and dragging back below half before letting go keeps the set. Tapping the Delete pill deletes too. The set number's Delete set accessibility action does the same. The ⋯ menu on an exercise card only removes the exercise.
- The logger header shows a stopwatch pill clock, a soft tinted Finish pill and a sets progress bar ("N of M sets done"). The next set to do has its number in green, and the field being typed in gets a focus ring.
- The Add exercise sheet has a title bar with the shared round glass ✕. Exercises already in the workout are marked "In workout"; picking one closes the sheet, scrolls to that exercise's card and flashes it instead of adding a duplicate. Picking a new exercise adds its card and just closes the sheet.
- Remove Ask Compound during an active workout, including the exercise picker, and on Workout done.
- Tapping an exercise name in the logger opens its existing instructions/pictures page. Its native header shows a Done button on the right (the picker has a round Close ✕ at the top right); returning preserves completed sets and unfinished number fields. Normal catalogue navigation keeps its Exercises back control.
- Open the single database through the existing iOS excluded-directory helper. Named additive migrations apply once and roll back on failure.
- Each Train section is its own component under `apps/mobile/src/workout/trainSections/`, so later tickets fill one without editing another. The header Search exercises button and All exercises both open the exercise list.
- Settings unit responses are cached in the order they were sent, across Settings screens: a late response to an older save, or a profile read that was out while a unit was saved, does not overwrite the newer unit.

## How to get to it (user POV)

Open Train, tap Start workout, then Add exercise. Search and tap a bundled exercise to return to the workout. Enter reps and optional weight, then check Set 1 done. Tap an exercise name for its instructions and pictures, then tap Done to continue. Add more sets or exercises as needed. Tap Finish, then Done to return to Train. Checking a completed set again unlocks its inputs for correction.

## Driving it with Maestro (`flows/workouts.yaml`)

**Fixtures flow:** run `workouts-fixtures` when the change touches the logger's or Train's screen components (`WorkoutLogger`, `ExerciseCard`, `SetRow`, `SwipeDelete`, `TrainHome`, `trainSections/`, `WorkoutFixtures`), and at milestone end.

**Deep flow:** run `--deep` when the change touches the local workout store, its migrations or WorkoutProvider persistence (`apps/mobile/src/workout/deviceWorkoutStore.ts`, `apps/mobile/src/localDatabase/`, `apps/mobile/src/workout/WorkoutProvider.tsx`), and at milestone end.

Use Launch and Doctor from `../SKILL.md`, then run:

```bash
bash .claude/skills/verify-compound/scripts/run-flow.sh workouts
```

`run-flow.sh workouts` drives steps 1–4 and 6 across `online` and `offline` phases; steps 8–9 are the separate flow `flows/workouts-fixtures.yaml` (`run-flow.sh workouts-fixtures`, phases `fixtures` and `fixtures-large-text`). The runs handle `adb reverse --remove tcp:3000`, `svc wifi/data disable`, and `settings put system font_scale 2.0`, and restore all three in an `EXIT` trap even on failure. Maestro keeps a persistent driver on the emulator and uses `waitToSettleTimeoutMs: 250` on logger taps, so every logger control is driven while the real 1-second workout clock ticks.

1. Open Settings and select `lb`; return to Train. Capture `workout-train`, including the five separate sections.
2. Tap `Start workout`. Confirm `Add exercise` is visible and `Ask Compound` is absent. Capture `workout-empty`.
3. Tap `Add exercise`, confirm `Search exercises`, search `incline dumbbell press`, capture `workout-picker`, then select `Incline Dumbbell Press, Dumbbell`. Confirm `Set 1 reps` and `Set 1 weight in lb`, and capture `workout-first-exercise`. Type `8` reps into Set 1, leave its weight blank, and tap `Set 1 done`. Tap `Add set to Incline Dumbbell Press`, then type `7` reps and `22.` (unfinished) into `Set 2 weight in lb`. Tap `Incline Dumbbell Press`, confirm `How to do it` and `Done`, tap `Done`, and confirm `1 of 2 sets done` and `22.` persist. Tap `Add exercise`, search `pushups`, and select `Pushups, Body only`. Tap `Add set to Pushups` repeatedly and scroll down until `Incline Dumbbell Press` is off screen. Tap `Add exercise` again, search `incline dumbbell press`, confirm `Incline Dumbbell Press, Dumbbell, in workout`, select it, wait for `Search exercises` to close, confirm `Incline Dumbbell Press` and `Set 1 reps` are back on screen, and capture `workout-jump`. Scroll to `More for Pushups`, tap `Remove exercise`, and confirm `Pushups` is gone and `1 of 2 sets done` holds.
4. `run-flow.sh` removes the API reverse (`adb reverse --remove tcp:3000`) and disables emulator Wi-Fi and mobile data while keeping Metro's `8082` reverse up. Finish Set 2's weight as `22.5` lb and tap `Set 2 done`. Confirm `2 of 2 sets done` and capture `workout-offline-sets`. Tap `Add set to Incline Dumbbell Press` (`2 of 3 sets done`), swipe Set 3 left from `Set 3 done` past half the row width and release; confirm `Set 3` is gone and `2 of 2 sets done` returns, and capture `workout-swipe-delete`.
5. *(Deep flow, `flows/workouts-deep.yaml`, run with `run-flow.sh --deep workouts`; it starts its own workout offline, so its screenshots are `workout-deep-*`.)* Force-stop and reopen Compound (`stopApp` + `launchApp` while offline), open Train, confirm `2 of 2 sets done` and `22.5` remain checked, and capture `workout-reopened`. Tap `Add set to Incline Dumbbell Press`, type `5` into `Set 3 reps` without checking it, force-stop and reopen again, open Train, and confirm `2 of 3 sets done` and `5` remain unchecked.
6. Tap `Finish`, confirm `Workout done`, today's date subtitle, and `Sets done: 2` (the unchecked Set 3 is not counted), confirm `Ask Compound` is absent, and capture `workout-finished` (MochiFlex plays beside the title). Tap `Done` and confirm `Start workout` returns. `run-flow.sh` restores `:3000` reverse and Wi-Fi/data even on failure.
7. **Post-flow SQLite inspection (shell step):** Copy the live database and WAL files into `$EVIDENCE_DIR` and query the copy read-only (never modify rows):
   ```bash
   eval "$(bash .claude/skills/verify-compound/scripts/drive.sh env)"
   for f in compound.db compound.db-wal compound.db-shm; do
     "$ADB" -s emulator-5554 exec-out run-as com.pratham124.compound cat "files/SQLite/$f" > "$EVIDENCE_DIR/$f" 2>/dev/null || rm -f "$EVIDENCE_DIR/$f"
   done
   ```
   Check the account UUID, non-null `finished_at`, set values (`8` reps bodyweight done; `7` reps `22.5` lb done; `5` reps unchecked), and original unit (`lb`).
8. *(`workouts-fixtures`.)* `run-flow.sh` opens `compound://dev-fixtures?fixture=workout&workoutData=Worst`, captures `workout-fixture-worst`, `workout-fixture-demo`, and `workout-fixture-empty`, then sets `settings put system font_scale 2.0`, captures `workout-fixture-worst-large`, `workout-fixture-demo-large`, and `workout-fixture-empty-large`, and restores the original scale. Inspect both normal and large-text screenshots.
9. *(`workouts-fixtures`.)* `run-flow.sh` opens `compound://dev-fixtures?fixture=workout&workoutView=home` and captures `workout-fixture-home` (Train home sections only). The iPhone checks run in the real logger on a Release build: tap Start workout in Train, add an exercise and a few sets, then check that Finish is below the notch, Add set / Add exercise remain reachable after scrolling with the numeric keyboard open, and the native tab bar is not counted twice in the bottom spacing. An emulator cannot establish iOS safe-area or keyboard placement.

## Gotchas

- Pratham must check controls and entering sets on a physical iPhone Release build; Android and a development build do not establish touch/motion feel, iOS keyboard dismissal, safe areas, VoiceOver or Dynamic Type.
- The development client needs Metro after force-stop, so fully offline cold launch is an iPhone Release check. Removing only the API reverse proves workout operations do not require the server while Metro remains reachable.
- `offlineRecovery.test.tsx` runs the actual Expo auth-client cache with network fetches rejected and a closed/reopened disk SQLite database, through the real root layout and Train. It checks stable account identity, exercises, unfinished input, original units and completion flags. This automated check does not replace the iPhone Release check.
- `workout/navigation.test.tsx` drives the actual exercise picker back to Train, completes a bodyweight set, finishes, and returns with Done, checking chat visibility along that route.
- The existing iOS module excludes the database folder and WAL/SHM from iCloud backups. Check the real iPhone flag using Device checks; Android cannot prove that flag.
- Settings remains a server-backed flow; this ticket caches successful reads/saves for offline workout entry. It does not add offline Settings changes or upload workouts. Personal records, routines, last-time suggestions, rest timers and Save as a day belong to later tickets and are not fabricated on the finished screen.
- No native dependency, environment variable, server migration, database role, permission or grant changes. No formal replay model changes: server synchronization/replay is the next ticket.
