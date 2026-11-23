# Sync

The phone's uploads, for every kind of item. `POST /sync/changes` (`routes.ts`) takes a batch of changes, each `{ key, kind, itemId, changedAt, body }`, and answers each one `applied`, `stale` or `rejected` with a reason.

The module owns `sync_versions` (`migrations/0003_sync.sql`): per person and item, the change that last won, compared by `(changedAt, key)`. `applyChanges.ts` claims an item with one conditional upsert of that row before the kind writes anything, so a replay or an older edit writes nothing, and a concurrent upload for the same item waits on the row lock and then loses to the committed winner.

A kind (`kinds.ts`) is a name, a body schema and a write, given to the plugin as an option (`SYNC_KINDS` in `../app.ts`). Adding custom exercises or routines means describing a kind in its own module, not changing this one.

Only errors caused by the change's own data reject a change on its own: SQLSTATE class 23 as `conflict`, and class 22 (data exceptions such as a NUL byte or a number out of range) as `invalid-body`. Anything else, such as a timeout, a deadlock or a lost connection, fails the whole upload, so the phone keeps the changes and retries.

A body its kind refuses only because a list in it is too long (more than 50 exercises in a workout, or 50 sets in an exercise) is rejected `too-large`; the phone reaches the same answer with the same check (`bodyRejection` in `@compound/contracts`) and keeps such a workout rejected without sending it. A change whose `changedAt` is more than 5 minutes ahead of the server's clock is rejected `clock`, since it would otherwise win its item against every later honest edit.

The promise "an offline replay never creates a duplicate set" has a formal check in `.claude/skills/verify-offline-replay/`.
