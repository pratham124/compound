# Exercise catalogue

## Sub-features

- `exercises-browse` opens all 876 bundled exercises from Train's search button and scrolls a virtualized, alphabetical list without requesting catalogue text.
- `exercises-search` matches names without case sensitivity, trims surrounding spaces, combines the name with a primary-muscle filter, and shows an empty result message.
- `exercises-detail` shows the selected stable ID's name, metadata, full instructions and pictures. An unknown link shows Exercise not found.
- `exercises-images` downloads pictures only on the detail page and stores them in Expo Image's memory and disk cache. A failed first download offers retry.
- `exercises-shared-catalogue` uses one JSON source in `packages/exercise-catalogue/` for the app's offline bundle and the server. `apps/server/src/workouts/catalogue.test.ts` checks that the workouts module preserves every shared field and ID.

## How to get to it (user POV)

Sign in, open Train, tap Search exercises, then choose an exercise. Back returns to the searched list; back again returns to Train.

## Driving it with Maestro (`flows/exercises.yaml`)

Use Launch and Doctor from `../SKILL.md`, then run:

```bash
bash .claude/skills/verify-compound/scripts/run-flow.sh exercises
```

`run-flow.sh exercises` drives steps 1–4 and 7 across `online`, `offline`, `fixtures`, and `fixtures-large-text` phases; steps 5–6 are the deep flow `flows/exercises-deep.yaml` (`prime`, `clear-mem-cache`, `disk-offline`, `retry-online`), run with `run-flow.sh --deep exercises`. Both toggling emulator Wi-Fi/data, `:3000` reverse, and `font_scale 2.0` between phases and restoring all three on exit even if a phase fails. Inspect every captured screenshot in `$EVIDENCE_DIR` (a labelled image view alone does not prove pixels loaded).

**Deep flow:** run `--deep` when the change touches the exercise image cache or the exercise detail screen (`apps/mobile/src/exercises/`), and at milestone end.

1. Tap Train, confirm Search exercises and capture `exercises-train`. Tap Search exercises, confirm Exercises and capture `exercises-list`.
2. Type `incline dumbbell press` into Search exercises. Confirm `Incline Dumbbell Press, Dumbbell`. Tap Chest, confirm that row still appears, and capture `exercises-search` (no result-count footer). Tap Legs and confirm `No matching exercises` and `Try another name or muscle.`, capturing `exercises-empty` (no action button). Tap All to return to the matching exercise before the detail step.
3. Tap `Incline Dumbbell Press, Dumbbell`, confirm How to do it and both `Incline Dumbbell Press, picture 1 of 2` and `Incline Dumbbell Press, picture 2 of 2`. Capture `exercises-detail-online` and inspect the screenshot to confirm pixels loaded.
4. `run-flow.sh` disables emulator Wi-Fi and mobile data. The flow goes back, searches `dumbbell shoulder press` offline, then searches `incline dumbbell press` again, opens its row, confirms How to do it, and captures `exercises-detail-offline`.
5. For disk-cache proof, `run-flow.sh` re-enables network briefly so the flow opens `compound://dev-device-checks`, taps Clear memory cache, confirms `memory cache cleared: true`, and captures `exercises-memory-cache-cleared`. `run-flow.sh` then removes `tcp:3000` reverse (leaving Metro's `8082` reverse up) and disables Wi-Fi/data; the flow returns to Train, searches and reopens `Incline Dumbbell Press`, and captures `exercises-detail-disk-offline` (both pictures must still show). A cold offline development-client restart can stall before the app's first screen; the fully offline Release-launch check remains on the iPhone.
6. Still offline, the flow opens an unviewed exercise (`Ab Roller`), confirms the `Retry Ab Roller...` button appears (`exercises-detail-offline-retry`), then `run-flow.sh` restores network and the flow taps Retry if it is still showing (the app often reloads the pictures itself first), confirms `Ab Roller, picture 1 of 2` is back and captures `exercises-detail-retried`.
7. Dev fixtures: opens `compound://dev-fixtures?fixture=exercises&exerciseData=Worst`, captures `exercises-fixture-worst`, `exercises-fixture-demo`, and `exercises-fixture-missing`, then `run-flow.sh` sets `font_scale 2.0` and re-captures `exercises-fixture-worst-large` and `exercises-fixture-missing-large` before restoring the original scale. The iPhone's accessibility text sizes need their own check.

Every flow parks expo-dev-client's floating `Tools` button on the left edge via `flows/_park-tools.yaml`. If the app still shows old labels after source edits, run Cleanup and Launch again before treating a failed assertion as an app bug.

## Gotchas

- Pratham deferred the physical iPhone Release-build check. Scrolling, fast typing/search and fully offline cold launch remain unverified on a Release build. If resumed, use the existing `device` EAS profile (`eas build --platform ios --profile device`); a development build or Android emulator cannot satisfy that check.
- On that Release build, enable airplane mode before launching and check browsing/search. Load a detail online first, force-close, then relaunch in airplane mode and reopen it to check the iOS disk cache. A first-view picture without a cached copy requires a connection.
- Expo Image's cache is managed by the operating system and can be evicted. No cache guarantees survival of app-data clearing or OS cache cleanup.
- iOS safe areas, Dynamic Type, VoiceOver and native back-swipe need the iPhone. The emulator only checks shared JavaScript/layout and Android cache behavior.
- Catalogue and picture URLs are pinned to free-exercise-db revision `f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5`. No new native dependency, server route, environment variable, migration or database role is required.
