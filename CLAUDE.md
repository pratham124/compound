# Compound

## Keep verification in step with the code

Pstack's verification skills are marked so they can't be invoked as skills. Follow them by reading the skill file from the newest pstack version: `~/.claude/plugins/cache/*/pstack/<newest>/skills/<name>/SKILL.md`. The pstack adapter at `docs/harness/claude-code.md` explains how its Cursor names map to Claude Code.

A hook, `.claude/hooks/check-verification.mjs`, blocks `gh pr create` when a PR breaks either rule below.

### App verification (`.claude/skills/verify-*/`)

Before opening a PR that changes what a user sees or does, follow `maintain-verification-skill`, scoped to the features this diff touches:
- add a `features/<feature>.md` for each new feature;
- fix the feature files this change made wrong;
- drive each touched feature live, and put the evidence in the PR description.

Commit the feature-map changes in the same PR, so the map never lags the code.

If no `verify-*` skill exists yet, skip this rule. Create one with `/pstack:create-verification-skill` once there's an app to drive (end of M1).

### Formal verification (any skill with a `covers.txt`)

Each formal verification skill lists the code it covers in `covers.txt`: one repo-relative path or directory prefix per line, with `#` for comments. The hook reads this file, because the skill's own coverage record is prose.
- **Creating one with `create-formal-verification-skill`:** write `covers.txt` next to its `SKILL.md`.
- **A PR that changes a covered path:** follow `maintain-formal-verification-skill` for that check before opening the PR. Update the model or harness and the sync commit, rerun it, and commit those changes in the same PR. If it finds a bug in the code, report it to Pratham instead of changing the property to match.

Candidates, in milestone order (these are the promises tests rarely reach):
- **M2:** an offline replay never creates a duplicate set.
- **M4:** bank sync never misses or doubles a transaction when webhooks overlap.
- **M4:** a budget alert fires at most once per category per month.
- **M5:** the chat allowance is never overspent by more than 1%.

### When a PR really changes nothing a check describes

Put a line starting `No verification update:` with the reason in the PR body, for example a refactor with identical behavior. The hook lets the PR through and the reason stays visible to reviewers.
