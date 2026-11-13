---
name: ticket
description: Start one ready-for-agent issue in its own worktree. Checks it can start, claims it, opens a worktree with feature-worktree, then builds it by following /implement. Use when Pratham types /ticket <issue number>.
argument-hint: <issue number>
disable-model-invocation: true
---

# Ticket

One issue, one worktree, one session. To work tickets in parallel, open one Claude pane per ticket in the main checkout and run `/ticket <n>` in each. Each session moves itself into its own worktree.

## 1. Check the ticket can start

```bash
gh issue view <n> --json number,title,state,labels,assignees
gh api graphql -f query='{repository(owner:"pratham124",name:"compound"){issue(number:<n>){blockedBy(first:20){nodes{number title state}}}}}'
```

Take the first row that matches:

| Finding | Action | Why |
|---|---|---|
| No issue number given | List the open `ready-for-agent` issues that have no assignee and no open blockers, by title, and ask which one. | Pratham picks the ticket. |
| Issue is closed | Stop and say so. | Nothing to build. |
| It has an assignee | Stop. Name the assignee and ask whether to resume. If Pratham says yes, skip step 2 and resume (step 3). | The assignee is the claim. Another session may already be building it, and two sessions on one ticket make two branches that conflict. |
| A blocker is open | Stop and list the open blockers by title. | The ticket builds on code that isn't on `main` yet. |
| No `ready-for-agent` label | Stop and say which labels it has. | `wayfinder:*` issues are decisions, worked through `/wayfinder`, and `ready-for-human` issues need Pratham. Neither is build work. |
| Otherwise | Say the issue's title and go on. | |

## 2. Claim it

Run `gh issue edit <n> --add-assignee @me` before creating anything. The assignee is how parallel sessions see the ticket is taken, so claiming first means two sessions can't both pass step 1.

## 3. Open its worktree

Call the Skill tool with `feature-worktree` and follow it. Name the branch `<n>-<2–4 kebab-case words from the title>`, for example `23-monorepo-lint-ci`. This overrides feature-worktree's naming rule, because the number ties the branch to its issue in `git branch` and in Herdr's sidebar.

When resuming, look for the branch in `git worktree list` first. If a worktree has it, enter that worktree with `EnterWorktree` and don't create a new one. Otherwise follow feature-worktree's existing-branch path.

Everything after this step happens inside the worktree, including installing dependencies and copying `.env` as feature-worktree says.

## 4. Build it

Find the newest `/implement` and follow it, with issue `<n>` as its ticket:

```bash
ls -d ~/.claude/plugins/cache/*/mattpocock-skills/*/skills/engineering/implement/SKILL.md | sort -V | tail -1
```

Read the file instead of invoking `/implement`, because it's marked user-only, so the Skill tool refuses it. Reading it when the skill runs also picks up plugin updates. If the command finds nothing, stop and tell Pratham the plugin moved or was removed. Never improvise a replacement build flow, because then this skill no longer means "the ticket was built the /implement way".

## 5. Hand back

`/implement` leaves the changes uncommitted. Stop there and report:
- the worktree path and branch;
- what changed, in a few lines;
- the typecheck and test results, and the `/code-review` findings.

Then tell Pratham the next step: look over the diff, then run `/no-mistakes` from this worktree, with `Closes #<n>` in the PR body so merging closes the issue.

Never commit, push, or open a PR in this skill. Pratham reviews the diff before it ships, and every PR in this repo goes through `/no-mistakes` (CLAUDE.md, "Shipping a PR").
