# Compound

## TypeScript

Before editing any `.ts` or `.tsx` file, read pstack's `typescript-best-practices` skill and follow it. That's `SKILL.md` plus `references/patterns.md`, under `~/.claude/plugins/cache/*/pstack/<newest>/skills/typescript-best-practices/`. Read the `principle-type-system-discipline` skill it names first. The skill is marked so it can't be invoked, and `/poteto-mode` doesn't load it, so without this line its rules (discriminated unions, branded IDs, no `as` casts, exhaustive `never` checks, parsing at boundaries) wouldn't apply. Read them once per session, not per file. When handing TypeScript work to a subagent, tell it to do the same.

## Code comments

Don't write a comment that restates what the code already says, such as explaining what `SplashScreen.setOptions({ fade: true, duration: 200 })` does or why 200ms was picked. Comment only what a reader couldn't get from the code: a hidden constraint, a workaround, or a choice someone would otherwise "fix". The reasoning behind a choice goes in the PR description or `docs/tradeoffs.md`. When handing work to a subagent, tell it the same.

## Architecture diagrams

The README shows four diagrams, exported from archify sources:

| Diagram (`docs/architecture/`) | Source (`docs/diagrams/`) | Shows |
|---|---|---|
| `deployment.svg` | `architecture-deployment-*` | what runs where: phone, server roles, AWS and outside services |
| `modules.svg` | `architecture-modules-*` | the server's modules and what each owns |
| `plaid-webhook-flow.svg` | `sequence-plaid-webhook-*` | a Plaid webhook through to stored transactions |
| `sleep-recovery-note-flow.svg` | `sequence-sleep-recovery-note-*` | sleep arriving through to a recovery note |

A PR that changes something a diagram shows updates that diagram in the same PR, using the archify skill. That includes PRD-only PRs, which is where architecture usually changes first. Examples: adding a module or service, moving a responsibility between modules, or adding or reordering a step in either flow.
- **The sources aren't in git.** `docs/diagrams/` is listed in `.git/info/exclude`, so the sources exist only in Pratham's main checkout. In a worktree, copy the source folder in first. Copy it back to the main checkout when you're done, because the main checkout is their only home. no-mistakes runs don't have them, so the Document step can only flag a stale diagram, not redraw it.
- **Edit the source, not the SVG.** Start archify from the existing `candidate.json`, so the layout and style carry over, then run `finalize`. If that HTML already has browser-check results, pass `--out-dir <folder>/review-<n>`.
- **Export from the viewer.** Open the HTML and use its export menu's SVG item. The CLI has no SVG export, and the current SVGs came from that menu. Write the SVG back to the same `docs/architecture/` file, because the README links to those paths.
- **Same folder, no new timestamp.** Update the source folder where it is.
- **Say so in the PR.** Name the diagram you updated in the PR description, or say why no diagram changed.

## Tests: no vacuous or redundant ones

Every test must be able to fail when the behavior it names breaks, and no two tests should guard the same thing. A test that can't fail costs run time and upkeep while proving nothing, and duplicates make every behavior change edit several tests. This applies to the author and to the no-mistakes Review step: raise each vacuous or redundant test as a finding.

**Vacuous: rewrite or delete it when:**
- **It would still pass if the code were wrong.** For example, the code under test was deleted, returned a constant, or skipped its work. Before keeping a new test, break the behavior once (temporarily) and confirm the test fails. Say in the PR which break you tried.
- **Its expected value comes from the code's own logic,** or it only checks its own mocks. The expected value must come from somewhere independent: the PRD, a worked example, or a known constant.
- **It reads source text** (greps or regex-matches the implementation) instead of running the code.
- **It only checks what the type checker or a schema already enforces.**

**Redundant: delete it when:**
- **Another test already fails for the same broken behavior,** meaning the same rule and the same branch. Keep the one that best names what broke.
- **The behavior it checks was removed or changed on purpose.** Update or delete it in the same PR.

**In every PR that changes behavior,** look at the existing tests for the code you touched and delete the ones the change made redundant, in that PR. Never park a test with `.skip`, `.todo` or a commented-out body. Delete it, and give the reason in the commit message.

A formal check of a TLA+ model doesn't make tests of the real code redundant, because the model isn't the code. A test that repeats one interleaving the model already covers is still useful if it runs the real code.

## Starting a ticket

Start each `ready-for-agent` issue with `/ticket <n>`, a user skill in `~/.claude/skills/ticket/`. It claims the issue and opens its own worktree. A builder agent then builds it test-first, one acceptance criterion at a time, and a separate reviewer agent reviews it with Addy Osmani's skills, at most twice. It stops for you to review the branch before `/no-mistakes`. For parallel tickets, use one pane per ticket. A hook, `.claude/hooks/require-worktree.mjs`, blocks edits to tracked files in the main checkout, because other sessions work there. Gitignored files such as `docs/tradeoffs.md` are still editable there.

## Keep verification in step with the code

Pstack's verification skills are marked so they can't be invoked as skills. Follow them by reading the skill file from the newest pstack version: `~/.claude/plugins/cache/*/pstack/<newest>/skills/<name>/SKILL.md`. The pstack adapter at `docs/harness/claude-code.md` explains how its Cursor names map to Claude Code.

### Shipping a PR

Ship every PR through `/no-mistakes`. A hook, `.claude/hooks/require-no-mistakes.mjs`, blocks a bare `gh pr create`. To bypass it, put a line `Skipped no-mistakes: <reason>` in the PR body.

Before `axi run`:
- Run `node scripts/verification/pipeline-skips.mjs`. If it prints `test`, the change is docs or tooling only, so pass `--skip test`.
- For app changes, pass `--verification-plan` naming the features the change touches.

What the pipeline then does (`.no-mistakes.yaml`):
- **Review** checks the diff.
- **Document** creates or updates the feature-map files in `.claude/skills/verify-*/features/`.
- **Test** drives each touched feature live with `verify-compound` and attaches the evidence.
- **Gate `verification-sync`** fails if app code changed without a feature-map change, or a formal check's covered code changed without its skill changing.
- **Gate `formal-checks`** runs each formal check whose covered code changed.

The `gates` and the Test and Document instructions in `.no-mistakes.yaml` only take effect from `main`, so a PR that changes them doesn't exercise them.

Once an app exists, create `verify-compound` with `/pstack:create-verification-skill` (end of M1). Until then Test only runs the repo's tests.

### Formal verification (any skill with a `covers.txt`)

Each formal verification skill has two small files next to its `SKILL.md`:
- `covers.txt`: the code it covers, one repo-relative path or directory prefix per line, `#` for comments.
- `check.txt`: one command that runs the check from the repo root (first non-comment line).

Write both when you create one with `create-formal-verification-skill`.

Keeping the model right is the author's job before the pipeline run. When a PR changes covered code, follow `maintain-formal-verification-skill` for that check: update the model or harness and the sync commit, rerun it, and commit those changes in the same PR. If it finds a bug in the code, report it to Pratham instead of changing the property to match.

`maintain-formal-verification-skill` only updates checks that already exist. It never creates one, so new checks come from these two rules:
- **A PR that implements a promise below** follows `create-formal-verification-skill` for it in the same PR, including `covers.txt` and `check.txt`. Run it once the code exists, because there's nothing to verify before then.
- **A maintain run that reports uncovered code** (new code that should have its own check): tell Pratham in the PR description and in your reply. Don't create the check unasked, because choosing a promise to verify is his call.

Promises to verify, in milestone order (these are the ones tests rarely reach):
- **M2:** an offline replay never creates a duplicate set.
- **M4:** bank sync never misses or doubles a transaction when webhooks overlap.
- **M4:** a budget alert fires at most once per category per month.
- **M5:** the chat allowance is never overspent by more than 1%.

### When a change really updates nothing a check describes

Put a line starting `No verification update:` with the reason in a commit message, for example a refactor with identical behavior. The gates can't see the PR body, so it has to be in a commit. The `verification-sync` gate then passes.
