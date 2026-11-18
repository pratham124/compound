# Exercise catalogue

Source: [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db), revision `f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5`.

`catalogue.json` is the unmodified `dist/exercises.json` from that revision. The upstream public-domain dedication is in `LICENSE.md`. IDs, names, instructions, metadata and image paths are preserved. Images load from the same pinned revision only when an exercise page is viewed, using Expo Image's disk cache from the M2 native build.

The server's copy lives in `apps/server/src/workouts/catalogue.json`. Its parity test compares every field with the app's bundled copy; update both copies together when deliberately updating the catalogue. Neither app nor server fetches catalogue text at runtime.
