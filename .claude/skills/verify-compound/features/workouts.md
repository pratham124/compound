# Offline workout logger

## Sub-features

- Start an empty workout from Train, add bundled exercises, enter reps and optional weight, check each completed set, and finish without the API.
- Save every draft edit to the account's workout in `compound.db`, including unfinished number fields. A saved draft restores on Train after force-stop.
- Keep rejected draft edits available for retry after returning to Train. Refocus reads cannot overwrite newer edits; a failed Finish keeps the logger active.
- Cache successful Settings unit reads and saves per account. The local write is best-effort: if it fails, Settings still shows the server's answer instead of an error. Enter/display kg or lb and retain the original unit on each set. Existing weights convert for display after a Settings change.
- Cancel a previous account's profile refresh before reading current credentials or writing its local preference. Converted weights show to the nearest 0.5 (10 kg → 22 lb, 22 lb → 10 kg) while keeping the stored units.
- Finish waits for queued input writes, persists the finished snapshot, then shows Workout done with elapsed minutes and completed set count.
- The finished summary fades in over 180 ms with the shared ease-out; opacity remains under Reduce Motion, with no translation or scale.
- The elapsed clock updates seconds in its own component, without rerendering exercise inputs. Long durations use hours:minutes:seconds; the header wraps and stacks at larger text sizes.
- The logger owns its top safe-area inset, so the fixed Finish header stays below the iPhone status area. Native scroll insets handle the tab bar, and platform keyboard avoidance keeps the numeric fields reachable.
- Exercise cards use one Set / Last time / unit / Reps header, compact number fields, 28-point check circles in 44-point targets, a short Add set label and an outlined Add exercise control. Last-time placeholders are dashes until history is implemented; larger text moves that column beneath each row.
- Train uses the reviewed empty Next day card, This week calendar placeholder and grouped routine/record rows. Start empty workout is a quiet row. Workout done pairs the Mochi face with its title and shows Time/Sets as grouped key-value rows.
- Remove Ask Compound during an active workout, including the exercise picker, and on Workout done.
- Tapping an exercise name in the logger opens its existing instructions/pictures page. Its native header shows a Done button on the right (the picker has a round Close ✕ at the top right); returning preserves completed sets and unfinished number fields. Normal catalogue navigation keeps its Exercises back control.
- Open the single database through the existing iOS excluded-directory helper. Named additive migrations apply once and roll back on failure.
- Keep Next day, Past workouts, Routines and Personal records as separate Train sections for later tickets. The header Search exercises button opens the exercise list.

## How to get to it (user POV)

Open Train, tap Start empty workout, then Add exercise. Search and tap a bundled exercise to return to the workout. Enter reps and optional weight, then check Set 1 done. Tap an exercise name for its instructions and pictures, then tap Done to continue. Add more sets or exercises as needed. Tap Finish, then Done to return to Train. Checking a completed set again unlocks its inputs for correction.

## Driving it with drive.sh (adb on an Android emulator)

Use Launch, Doctor, Drive, Evidence and Cleanup from `../SKILL.md`. Capture screenshots before actions and after finding the resulting screen's label.

1. Open Settings and select lb; return to Train. Capture `workout-train`, including the separate sections.
2. Tap Start empty workout. Find Add exercise and verify Ask Compound is absent. Capture `workout-empty`.
3. Tap Add exercise, find Search exercises, search `incline dumbbell press`, then select `Incline Dumbbell Press, Dumbbell`. Find Set 1 reps and Set 1 weight in lb. Capture `workout-picker` and `workout-first-exercise` before/after selection. After editing/checking a set and partially typing the next one, tap `Incline Dumbbell Press`, find How to do it and Done. Tap Done and confirm both the checked set and unfinished text remain.
4. Remove the API reverse (`adb reverse --remove tcp:3000`), disable emulator Wi-Fi and mobile data, leaving Metro's 8082 reverse available. Type 8 reps, leave weight blank, and tap Set 1 done. Add a set, enter 7 reps and 22.5 lb, then mark Set 2 done. Confirm the completed checks and capture `workout-offline-sets`.
5. Force-stop/restart via `drive.sh restart`, open Train, and confirm both completed sets and their values remain. Capture `workout-reopened`. Input a third unfinished set, restart, and confirm its partial text remains too.
6. Tap Finish, find Workout done and Sets done: 2, verify Ask Compound absent, and capture `workout-finished`. Tap Done; Train must offer Start empty workout again. Restore the API reverse and Wi-Fi/data even on failure.
7. Inspect real local rows with `adb exec-out run-as com.pratham124.compound cat databases/compound.db` plus its WAL/SHM files copied to the evidence directory before querying, or use the runtime database on the device. Check the account UUID, finished_at, set values and original unit. Never modify rows to manufacture evidence.
8. Open `compound://dev-fixtures?fixture=workout&workoutData=Worst`. Inspect Workout Demo, Workout Worst and Workout Empty. Worst uses the longest bundled exercise name, 999 reps, 99999 weight, a long elapsed time and the retry state. Repeat with `settings put system font_scale 2.0`, then restore the original scale; inspect both appearances. The fixtures write no real workouts.
9. Open `compound://dev-fixtures?fixture=workout&workoutView=home` for the Train presentation fixture. On the iPhone check that Finish is below the notch, Add set / Add exercise remain reachable after scrolling with the numeric keyboard open, and the native tab bar is not counted twice in the bottom spacing. An emulator cannot establish iOS safe-area or keyboard placement.

## Gotchas

- Pratham must check controls and entering sets on a physical iPhone Release build; Android and a development build do not establish touch/motion feel, iOS keyboard dismissal, safe areas, VoiceOver or Dynamic Type.
- A live seconds clock can prevent legacy uiautomator from obtaining an idle accessibility tree. If drive.sh reports an empty tree while the screenshot shows the logger, preserve the screenshot/dump result and report the undriven steps. Do not guess coordinates or pause the shipped clock for evidence.
- The development client needs Metro after force-stop, so fully offline cold launch is an iPhone Release check. Removing only the API reverse proves workout operations do not require the server while Metro remains reachable.
- `offlineRecovery.test.tsx` runs the actual Expo auth-client cache with network fetches rejected and a closed/reopened disk SQLite database, through the real root layout and Train. It checks stable account identity, exercises, unfinished input, original units and completion flags. This automated check does not replace the iPhone Release check.
- `workout/navigation.test.tsx` drives the actual exercise picker back to Train, completes a bodyweight set, finishes, and returns with Done, checking chat visibility along that route.
- The existing iOS module excludes the database folder and WAL/SHM from iCloud backups. Check the real iPhone flag using Device checks; Android cannot prove that flag.
- Settings remains a server-backed flow; this ticket caches successful reads/saves for offline workout entry. It does not add offline Settings changes or upload workouts. Personal records, routines, last-time suggestions, rest timers and Save as a day belong to later tickets and are not fabricated on the finished screen.
- No native dependency, environment variable, server migration, database role, permission or grant changes. No formal replay model changes: server synchronization/replay is the next ticket.
