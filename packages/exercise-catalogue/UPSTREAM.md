# Exercise catalogue

Source: [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db), revision `f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5`.

`catalogue.json` is the unmodified `dist/exercises.json` from that revision. The upstream public-domain dedication is in `LICENSE.md`. IDs, names, instructions, metadata and image paths are preserved. Images load from the same pinned revision only when an exercise page is viewed, using Expo Image's disk cache from the M2 native build.

This package is the single catalogue source for both the mobile app and the server's workouts module. The app bundles the JSON for offline browsing; the server resolves the same package file locally. Update this file once when deliberately changing the catalogue. The workouts test checks its runtime catalogue against every shared field and ID. Neither app nor server fetches catalogue text at runtime.
