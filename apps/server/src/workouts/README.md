# Workouts catalogue

`catalogue.ts` owns the server's exercise catalogue and stable-ID lookup. It reads the JSON exported by `@compound/exercise-catalogue`, the same source the app bundles offline, so no network request or per-person database access is needed.

The source is [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) at revision `f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5`. Its unmodified JSON, Unlicense dedication, and provenance live together in `packages/exercise-catalogue/`.

Update the shared catalogue once. `catalogue.test.ts` checks that the workouts module preserves every shared field and upstream ID. Images stay hosted at the pinned upstream revision and are cached by the phone; this module stores their relative paths only.

# Workouts and sets

`workouts`, `workout_exercises` and `workout_sets` (`migrations/0004_workouts.sql`) hold finished workouts, keyed by `user_id` first, under forced row-level security for `compound_api`. `workoutStore.ts` is the module's one data-access place: `workoutKind` describes a workout to the sync module (`../sync/`), which calls its write only for a change that has won, and `readWorkout` serves `GET /workouts/:id` (`routes.ts`). A write replaces the workout: it deletes the workout's exercises, their sets go by cascade, and the body's exercises and sets are inserted under the phone's ids. Custom exercises and routines join as new kinds described here, without changing the sync module.
