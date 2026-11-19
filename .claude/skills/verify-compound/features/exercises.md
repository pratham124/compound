# Exercise catalogue

## Sub-features

- `exercises-browse` opens all 876 bundled exercises from Train's search button and scrolls a virtualized, alphabetical list without requesting catalogue text.
- `exercises-search` matches names without case sensitivity, trims surrounding spaces, combines the name with a primary-muscle filter, and shows an empty result message.
- `exercises-detail` shows the selected stable ID's name, metadata, full instructions and pictures. An unknown link shows Exercise not found.
- `exercises-images` downloads pictures only on the detail page and stores them in Expo Image's memory and disk cache. A failed first download offers retry.
- `exercises-shared-catalogue` uses one JSON source in `packages/exercise-catalogue/` for the app's offline bundle and the server. `apps/server/src/workouts/catalogue.test.ts` checks that the workouts module preserves every shared field and ID.

## How to get to it (user POV)

Sign in, open Train, tap Search exercises, then choose an exercise. Back returns to the searched list; back again returns to Train.

## Driving it with drive.sh (adb on an Android emulator)

Use Launch and Doctor from `../SKILL.md`. Set `D=.claude/skills/verify-compound/scripts/drive.sh` and `eval "$(bash $D env)"` in each Bash call. Capture screenshots before actions and after finding the new screen's handle.

1. Tap Train, find Search exercises and screenshot `exercises-train`. Tap Search exercises, find Exercises and screenshot `exercises-list`.
2. Type `incline dumbbell press` into Search exercises. Find `Incline Dumbbell Press, Dumbbell`. Tap Chest, verify that row still appears. Screenshot `exercises-search`; there is no result-count footer. Tap Legs and find `No matching exercises` and `Try another name or muscle.`. Screenshot `exercises-empty`; the empty state has no action button. Tap All to return to the matching exercise before the detail step.
3. Tap `Incline Dumbbell Press, Dumbbell`, find How to do it and both `Incline Dumbbell Press, picture 1 of 2` and `Incline Dumbbell Press, picture 2 of 2`. Inspect the screenshot to confirm pixels loaded; a labelled image view alone is insufficient. Dump the tree and screenshot `exercises-detail-online`.
4. Disable emulator network with `"$ADB" -s emulator-5554 shell "svc wifi disable; svc data disable"`. Go back, find the list's Search exercises field, search `dumbbell shoulder press` and verify a matching row with no connection. Search `incline dumbbell press` again, open its row, find How to do it and screenshot `exercises-detail-offline`. The same pictures must remain visible.
5. For disk-cache proof, open the existing `compound://dev-device-checks` screen and tap Clear memory cache. Dump its tree and confirm `memory cache cleared: true` (it is part of the combined image-status text). Remove the API reverse with `"$ADB" -s emulator-5554 reverse --remove tcp:3000`, disable Wi-Fi/data and return to Train. Search and reopen the viewed exercise. Screenshot `exercises-detail-disk-offline`; both pictures must still show. Restore `reverse tcp:3000 tcp:3000` and `svc wifi enable; svc data enable` even if a check fails. Metro's 8082 reverse stays in place. A cold offline development-client restart can stall before the app's first screen; that does not prove or disprove the image cache, and the fully offline Release-launch check remains on the iPhone.
6. For a first-view failure, offline open an exercise whose pictures were never viewed; find the Retry picture button, then enable network and tap it. The picture should replace the unavailable message.
7. Dev fixtures: open `compound://dev-fixtures?fixture=exercises&exerciseData=Worst`. The buttons Exercises Demo, Exercises Worst and Exercises Missing persist the choice in route parameters. Inspect long names, long equipment, instructions, a failing picture, non-Latin text, emoji and absent metadata. Empty and one-result states use the real search list. Repeat at the emulator's largest font scale (`settings put system font_scale 2.0`), then restore the original scale; inspect light and dark appearance. The iPhone's accessibility text sizes need their own check.

The SDK 58 development client can show a floating Tools button over app controls. Its supported development-launch flags `__expo_disable_fab=1` and `__expo_disable_auto_launch=1` hide it for that process; they do not alter the app or persist preferences. If the app still shows old labels after source edits, Cleanup and Launch again before interpreting a failed tap as an app bug.

## Gotchas

- Pratham deferred the physical iPhone Release-build check. Scrolling, fast typing/search and fully offline cold launch remain unverified on a Release build. If resumed, use the existing `device` EAS profile (`eas build --platform ios --profile device`); a development build or Android emulator cannot satisfy that check.
- On that Release build, enable airplane mode before launching and check browsing/search. Load a detail online first, force-close, then relaunch in airplane mode and reopen it to check the iOS disk cache. A first-view picture without a cached copy requires a connection.
- Expo Image's cache is managed by the operating system and can be evicted. No cache guarantees survival of app-data clearing or OS cache cleanup.
- iOS safe areas, Dynamic Type, VoiceOver and native back-swipe need the iPhone. The emulator only checks shared JavaScript/layout and Android cache behavior.
- Catalogue and picture URLs are pinned to free-exercise-db revision `f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5`. No new native dependency, server route, environment variable, migration or database role is required.
