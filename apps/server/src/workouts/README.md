# Workouts catalogue

`catalogue.ts` owns the server's exercise catalogue and stable-ID lookup. It reads the JSON exported by `@compound/exercise-catalogue`, the same source the app bundles offline, so no network request or per-person database access is needed.

The source is [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) at revision `f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5`. Its unmodified JSON, Unlicense dedication, and provenance live together in `packages/exercise-catalogue/`.

Update the shared catalogue once. `catalogue.test.ts` checks that the workouts module preserves every shared field and upstream ID. Images stay hosted at the pinned upstream revision and are cached by the phone; this module stores their relative paths only. This ticket adds no API routes or database tables.
