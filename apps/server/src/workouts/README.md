# Workouts catalogue

`catalogue.ts` owns the server's exercise catalogue and stable-ID lookup. It reads a bundled copy of free-exercise-db, so no network request or per-person database access is needed.

The source is [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) at revision `f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5`; `catalogue.json` is its unmodified `dist/exercises.json`. The Unlicense dedication is in `LICENSE.md`.

Update this file and `apps/mobile/src/exercises/catalogue.json` together. `catalogue.test.ts` compares every field, including the upstream IDs. Images stay hosted at the pinned upstream revision and are cached by the phone; this module stores their relative paths only. This ticket adds no API routes or database tables.
