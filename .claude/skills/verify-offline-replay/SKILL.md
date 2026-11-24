---
name: verify-offline-replay
description: Formal check of the promise "an offline replay never creates a duplicate set" (docs/agents/verification.md, M2). Use when a change touches the phone's upload outbox or sync runner, the server's sync endpoint or its last-write-wins claim, how the workout kind stores sets, or the workouts and sync_versions tables, and before /ship for such a change.
---

# Verify: an offline replay never creates a duplicate set

**The promise.** However often the phone's uploads are lost, timed out, resent or replayed, each set Pratham logged is stored on the server exactly once, as part of the newest edit of its workout.

**The harm if it breaks.** Training volume and PRs count a set twice, or an older copy of a workout overwrites a later edit, and nothing tells Pratham.

## What runs

`node .claude/skills/verify-offline-replay/run.mjs` (the line in `check.txt`), from the repo root, with Java 11 or later and the local stack up (`pnpm stack:up`). About a minute.

1. **TLC on `OfflineReplay.tla` with `OfflineReplay.cfg`**: the model of the code as it is. It must report `No error has been found`.
2. **TLC on each `broken/*.cfg`**: the same model with one guard turned off. Each must fail on the invariant its `\* expect:` line names. This shows the model can still fail; if a broken variant starts passing, the model has stopped describing that guard.
3. **`apps/server/src/workouts/lastWriteWins.test.ts`** against the real server and Postgres. Its fast-check property generates edits of two workouts on several devices, replays each up to twice, shuffles them, splits them into uploads and checks that each workout ends as its newest edit with each set once. This is what catches a change to the real code that the model doesn't know about.

The script downloads TLA+ tools `v1.7.4` once into `%LOCALAPPDATA%\compound-tla\` (or `~/.cache/compound-tla/`) and refuses a jar whose sha256 differs from the one pinned in `run.mjs`. `--model-only` skips step 3 when the stack is down; say so if you use it.

## The model

Two devices (`phone`, `tablet`), two workouts (`A`, `B`), three changes: `a1` (A on the phone, sets s1 and s2), `a2` (a later edit of A on the tablet that keeps s1 and drops s2) and `b1` (B on the phone, set s3). Up to `MaxSends = 4` uploads. Any change can be made in any order; any batch of a device's queued rows can be sent, as many times as the bound allows; a request or its answer can be lost; the server can abort a transaction part-way (deadlock, serialization failure, timeout).

| Model | Code |
|---|---|
| `Finish(c)` | the `workout_finished_*` triggers in `apps/mobile/src/localDatabase/migrations/0004-workout-sync.ts`: the outbox row is written by the same statement as the finished workout |
| `Send(d, batch)` | `pass()` and `upload` in `apps/mobile/src/sync/syncRunner.ts`; rows stay queued until answered |
| `LoseRequest`, `LoseAnswer` | offline, a timeout, a killed app; `uploadChanges` in `apps/mobile/src/sync/uploadApi.ts` throws and the rows stay |
| `Answer(a)` | `settle()` in `syncRunner.ts`: applied and stale rows are removed, rejected ones kept |
| `Begin`, `Commit` | `applyChanges` in `apps/server/src/sync/applyChanges.ts`, one `withUser` transaction per upload, changes sorted by item |
| `Step(id)` | one change: the `CLAIM` statement (insert ... on conflict do update ... where newer, returning), then on a win `workoutKind.write` in `apps/server/src/workouts/workoutStore.ts` on a savepoint |
| `Abort(id)` | an error `applyChanges` doesn't classify as the change's own data (anything outside SQLSTATE classes 22 and 23): the request fails with no answer |
| `Rank[c]` | the `(changed_at, change_key)` pair CLAIM compares |
| lock in `Step` | the `sync_versions` row lock CLAIM takes and holds to commit |

Flags, all `TRUE` for the code as it is: `ClaimIsConditional`, `ClaimLocks`, `DeleteBeforeInsert`, `SetIdIsPrimaryKey` (`workout_sets` key `(user_id, id)` in `apps/server/migrations/0004_workouts.sql`), `KeepRowsUntilAnswered`.

Invariants: `NoDuplicateSet` (the promise), `StoredIsWinner` (a workout's stored sets are exactly its winning change's), `NewestWins` (no change the server answered for is newer than what it stores), `NothingLost` (the phone drops a row only once the server holds that change or a newer one), `QuiescentSynced` (with nothing queued, in flight or rejected, the server holds every workout's newest change).

**Not covered.** Rejections caused by a set id that belongs to another workout (the model gives each workout its own set ids); phone clock skew (last write wins by the phone's clock is an accepted limit); changes rejected before the claim (`unknown-kind`, `invalid-change`, `invalid-body`, `too-large`, `clock`), which store nothing and are kept on the phone like any rejection (tested in `apps/server/src/sync/applyChanges.test.ts` and `syncRunner.test.ts`); the account-switch guard in `apps/mobile/src/sync/OutboxSync.tsx` (tested in `OutboxSync.test.tsx`) and the per-person outbox reads (tested in `syncRunner.test.ts`); the retry and wake-up timing in `syncRunner.ts` (tested in `syncRunner.test.ts`); row-level security (tested in `apps/server/src/workouts/isolation.test.ts`); more than two items, three changes or four uploads.

## Reading a result

Read every TLC result with the pstack `/statechart` skill: on a violation it tells the shortest path as plain steps, and on a pass it draws how the system moves between states.

- **The main model fails.** Replay the trace against the code, step by step, using the table above. If every step can happen in the code, it's a bug: report it to Pratham with the steps in the code's words, and don't change the property or the model to make it pass. If a step can't happen, the model is wrong: fix the model and say what was wrong.
- **A broken variant passes.** The model no longer exercises that guard. Fix the model.
- **The real-code step fails.** fast-check prints the counterexample (the planned edits, the batch size and the shuffle). It's a bug in the code unless the test itself is out of date with an intended change.

## When the covered code changes on purpose

Update the model so each changed step again points at code a reviewer can open, rerun, and move the sync commit below forward only once the model describes the code at the new commit. If the change alters the promise itself, the property changes too, and the PR says why. `/maintain-formal-verification-skill` covers changes that skipped this.

## Coverage

`covers.txt` lists the covered files. Last confirmed to describe the code: the #52 work on top of `b188b071e09acb951ee200435670cbac702b8be5`, before it was committed. The first maintain run after #52 merges sets this to the merge commit once it has checked the model against it.
