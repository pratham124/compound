# How Compound gets built

Claude writes the plan and the code. Gemini 4 Neon reads that work and looks for what Claude missed. Pratham makes every decision that changes the product, and he merges.

The skills that run this workflow (`/ticket`, `/review-ticket`, `/ship`) and their helper scripts are Pratham's personal Claude Code setup, so they live in his home folder, not in this repo. This page explains how they fit together. The repo-side pieces they use are `CLAUDE.md`, `CODING_STANDARDS.md`, `.no-mistakes.yaml`, the `verify-compound` skill, and the gate scripts in `scripts/verification/`.

## The stages

![Development workflow: one milestone, ticket by ticket](../architecture/development-workflow.svg)

[Open the interactive version](https://pratham124.github.io/compound/architecture/development-workflow.html).

Each ticket goes through three Claude Code windows. `/ticket` builds it and stops at a handback. `/review-ticket` is Pratham's review, and ends with his commit. `/ship` takes the commit to a pull request with green CI. A milestone repeats that loop for each ticket whose blockers are closed.

## Inside `/ticket`

![/ticket: how the orchestrator runs one ticket](../architecture/ticket-orchestration.svg)

[Open the interactive version](https://pratham124.github.io/compound/architecture/ticket-orchestration.html).

`/ticket` is an orchestrator. It writes and reviews no code. It starts a builder agent, passes reports between agents, and stops whenever a decision is Pratham's.

## Claude writes, Neon checks

A model is bad at catching its own mistakes, because the reasoning that produced a bug is the same reasoning that reviews it. Neon is a different model, so it notices different things. So each important piece of work gets read by the model that didn't write it:

- The PRD, before it's split into tickets.
- The ticket's code, in `/ticket`.
- The builder's fixes and Pratham's own changes, in `/ship`.

Neon never runs inside a Claude window. When a Neon step comes up, Claude writes Neon's inputs into the worktree's `.ticket/` folder and prints one `agy` command. Pratham runs it in a second terminal. Claude waits for Neon's review file to appear, then carries on. Claude never runs `agy` itself, because section 6 of Antigravity's terms bars other software from using Pratham's Antigravity sign-in.

## Each stage starts in a fresh Claude window

Every turn in a Claude window re-reads the whole conversation so far. In the first two milestones, `/ticket` windows reached 500,000 to 670,000 tokens of context, and 98% of their tokens went to review chat after the code was done. Splitting build, review, and ship into separate windows keeps each one short. Inside each window, agents do the file reading, because a file read in the window itself is re-read on every later turn.

Each issue also gets its own worktree, so several windows can build different issues at once without touching each other's files. `.claude/hooks/require-worktree.mjs` blocks edits to tracked files in the main checkout for the same reason.

## Plan before you split

Pick the planning skill by the size of the idea. `wayfinder` is for an idea too big for one window: it creates a `wayfinder:map` issue with one child issue per decision, settled one at a time. `grill-with-docs` is for an idea that fits one sitting. Either way, the result goes into `docs/prd/README.md`. `/ticket` refuses `wayfinder:*` issues, because they hold decisions, not build work.

Neon critiques the PRD before `/to-tickets` splits it. A gap found then costs one edit to the PRD. The same gap found after building costs a ticket. `/to-tickets` runs one milestone at a time, so each milestone's tickets start from what the last milestone taught.

## High-stakes changes stop for Pratham

Some changes pass every local test and then break in production: sign-in and sessions, database roles and row-level security, migrations that drop or rewrite data, and secrets. For each of these, the builder writes a plan before any code. `/ticket` has a fresh reviewer try to find holes in the plan, then shows Pratham the plan and the surviving doubts. The builder continues only after a clear yes, and each plan needs its own yes.

On these tickets, a Claude security auditor and a Claude test engineer review alongside Neon. The three never see each other's work, so none of them can steer the others. The builder fixes the serious findings from all three in one pass. Where they disagree, or the builder disputes a finding, the handback lists both sides for Pratham to decide.

## Reviews don't loop

A review always finds something new, so a loop that runs until every comment is addressed never ends. Before this workflow, the review pipeline on issue 51 ran several rounds, and the last round still found 17 problems. So each review step is capped:

1. Neon reviews the ticket once.
2. The builder fixes the serious findings once.
3. Neon re-checks only those fixes, once, and marks each finding Fixed, Partly fixed, Not fixed, or Disputed. Anything not fixed goes to Pratham in the handback.
4. In `/ship`, Neon reviews everything that changed after its first review: the builder's fixes and Pratham's own changes. `/ticket` saves a git ref right after the first review, `refs/ticket/<n>-reviewed`, so `/ship` knows where that starts.

## How verification fits in

Tests check the cases someone thought to write. The verification skills check the app the way a person uses it, and prove the few rules that must always hold. `docs/agents/verification.md` has the full rules.

### `verify-compound` drives the app on screen

`.claude/skills/verify-compound/` starts the local stack and the Android emulator, signs in a test person, and runs each feature's Maestro flow, which taps through the screens and takes screenshots in one command. It has one feature file per feature in `features/` and one flow per feature in `flows/`. Each feature file says how a user reaches the feature, the steps that drive it, and what only a real iPhone can check. Slow restart and offline steps sit in separate deep flows, and worst-case data in fixtures flows, which run only when their files change. A flow that fails is rerun once, and one that passes on the retry is reported as flaky, not failed.

The `/ticket` builder writes or updates the feature file and its flow along with the feature, and runs it once, so the flow gets reviewed with the code. `/ship` then only runs the touched features' flows and fills any gap a branch built outside `/ticket` left. The `check-sync.mjs` gate fails a ship when app code changed but no feature file did. At the end of each milestone, `maintain-verification-skill` drives every feature and fixes what drifted.

### Formal checks prove a rule always holds

A formal check is a small model or test harness that proves one rule for every case, not only the cases a test tries. It is a skill with a `covers.txt`, which lists the code it covers, and a `check.txt`, which holds the command that runs it. The rules worth proving are the "Promises to verify" in `docs/agents/verification.md`. Each check is created in the ticket that implements its promise, the first in issue #52.

After that, a ticket that changes covered code updates the check, and `/ship` runs every check whose covered code changed. Nothing edits a check to make it pass, because a failing check can mean a real bug. At milestone end, the sweep reruns every check and reports new code that deserves one, without creating it, because choosing what to prove is Pratham's call.

## What only Pratham decides

- Committing his code. Agents leave their work uncommitted so he can read it with `git diff`. The only commits made without asking are `/ship`'s own feature-file and fix commits, because typing `/ship` is his request for them.
- Merging.
- Each high-stakes plan.
- Design decisions from `break-ui`, motion ideas, and any finding marked as his call. After he corrects the UI in `/review-ticket`, `/learn-taste` turns the corrections into rules for the next builder.
- Shipping a feature that failed on the emulator.

## Between milestones

When every ticket in a milestone is merged:

1. `/retro` on the milestone.
2. pstack's `maintain-verification-skill` and `maintain-formal-verification-skill`.
3. If the milestone changed something the PRD assumed, `/grill-with-docs` updates the PRD, and Neon critiques the changed part.
4. `/to-tickets` for the next milestone, in a fresh Claude window on main.
