# Review rules

Each entry records a mistake that once got past review. A reviewer checks every file in the diff against the entries whose path glob matches it, and raises each miss as Required. Add an entry when something slips past review; delete one when a test or gate starts catching it.

## `**/*.test.*`

- Apply `CODING_STANDARDS.md` to every added or changed test, and to the existing tests of the code the change touched. Raise each vacuous or redundant test as a finding. Its rules moved out of `CLAUDE.md`, so nothing loads them unless this entry fires.

## `apps/server/migrations/**`

- `migrate.ts` applies each file once by name, so an edit to a migration already on main never runs anywhere it was applied. Changes to shipped schema go in a new numbered file.
- A table holding one person's data has a `user_id` column, row-level security enabled and forced, a policy `to compound_api` with `user_id = app_user_id()` in both `using` and `with check`, and grants to `compound_api` only. `rowLevelSecurity.test.ts` catches a missing enable/force but not a policy that is too wide (`using (true)`, the wrong role, or a missing `with check`).
- `compound_auth` reaches `users` and `accounts` only. Flag any new grant to it.

## `apps/server/src/**`

- A query on a per-person table runs inside `withUser` (`profileStore.ts`), never on the owner pool, which bypasses the policies or sees nothing depending on whether the owner is a superuser.
- The `query` function `withUser` passes in must not be stored or used after the callback returns.

## `apps/mobile/jest.*`

- On Linux, pnpm puts peer dependency names into package folder names (`react-native-reanimated@4.7.1_react-native-worklets@...`), while Windows shortens them to a hash. Resolver logic that matches a substring of a file path passes locally and breaks CI. Work out the package from the folder after the last `node_modules` instead.
- A local Windows test run is not evidence for a resolver change; ask for a Linux run (CI or a node container).

## `pnpm-lock.yaml`

- A local Windows test run is not evidence for a dependency change: pnpm's folder names differ on Linux, which has broken the mobile Jest resolver before. Ask for a Linux run.
