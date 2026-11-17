# Keep verification in step with the code

Pstack's verification skills are marked so they can't be invoked as skills. Follow them by reading the skill file from the newest pstack version: `~/.claude/plugins/cache/*/pstack/<newest>/skills/<name>/SKILL.md`. The pstack adapter at `docs/harness/claude-code.md` explains how its Cursor names map to Claude Code.

## Shipping a PR

Ship every PR through `/no-mistakes`. A hook, `.claude/hooks/require-no-mistakes.mjs`, blocks a bare `gh pr create`. To bypass it, put a line `Skipped no-mistakes: <reason>` in the PR body.

Before `axi run`:
- Run `node scripts/verification/pipeline-skips.mjs`. If it prints `test`, the change is docs or tooling only, so pass `--skip test`.
- For app changes, write the plan (the features the change touches) to a file and pass `--verification-plan <that file>`. Inline text gets read as a path and the run fails.
- Start Docker Desktop first if `docker info` fails: the Test step needs the stack, and a run that fails on it refuses a plain retry.

What the pipeline then does (`.no-mistakes.yaml`):
- **Review** checks the diff.
- **Document** creates or updates the feature-map files in `.claude/skills/verify-*/features/`.
- **Test** drives each touched feature live with `verify-compound` and attaches the evidence.
- **Gate `verification-sync`** fails if app code changed without a feature-map change, or a formal check's covered code changed without its skill changing.
- **Gate `formal-checks`** runs each formal check whose covered code changed.

The `gates` and the Test and Document instructions in `.no-mistakes.yaml` only take effect from `main`, so a PR that changes them doesn't exercise them.

`verify-compound` exists in `.claude/skills/verify-compound/`: it drives the app on an Android emulator against the local stack, and each feature file lists what only the iPhone can check. Keep its feature map in step with app changes (the `verification-sync` gate).

Each `/no-mistakes` run only updates and drives the features its change touches, so drift elsewhere builds up between runs. Follow pstack's `maintain-verification-skill` at the end of each milestone, and after any change that breaks the skill itself: a new stack service or port, or a native module that needs `scripts/build-dev-client.sh`. It drives every feature and fixes the feature map, `SKILL.md` and the scripts in one PR.

`.claude/skills/verify-compound/depends.txt` lists the files the skill's `SKILL.md` and scripts depend on (compose, the server's start and sign-in code path, the app's package id and sign-in labels), and the `verification-sync` gate fails when one changes and nothing in the skill outside `features/` does; the `No verification update:` commit line is the escape.

## Formal verification (any skill with a `covers.txt`)

Each formal verification skill has two small files next to its `SKILL.md`:
- `covers.txt`: the code it covers, one repo-relative path or directory prefix per line, `#` for comments.
- `check.txt`: one command that runs the check from the repo root (first non-comment line).

Write both when you create one with `create-formal-verification-skill`.

Keeping the model right is the author's job before the pipeline run. When a PR changes covered code, follow `maintain-formal-verification-skill` for that check: update the model or harness and the sync commit, rerun it, and commit those changes in the same PR. If it finds a bug in the code, report it to Pratham instead of changing the property to match.

Once a formal check exists, also run `maintain-formal-verification-skill` across every check at the end of each milestone, alongside `maintain-verification-skill`. It catches what skipped the per-PR step: merges, `No verification update:` escapes, and drift across many commits, where a check keeps passing while describing code that no longer exists.

`maintain-formal-verification-skill` only updates checks that already exist. It never creates one, so new checks come from these two rules:
- **A PR that implements a promise below** follows `create-formal-verification-skill` for it in the same PR, including `covers.txt` and `check.txt`. Run it once the code exists, because there's nothing to verify before then.
- **A maintain run that reports uncovered code** (new code that should have its own check): tell Pratham in the PR description and in your reply. Don't create the check unasked, because choosing a promise to verify is his call.

Promises to verify, in milestone order (these are the ones tests rarely reach):
- **M2:** an offline replay never creates a duplicate set.
- **M4:** bank sync never misses or doubles a transaction when webhooks overlap.
- **M4:** a budget alert fires at most once per category per month.
- **M5:** the chat allowance is never overspent by more than 1%.

## When a change really updates nothing a check describes

Put a line starting `No verification update:` with the reason in a commit message, for example a refactor with identical behavior. The gates can't see the PR body, so it has to be in a commit. The `verification-sync` gate then passes.
