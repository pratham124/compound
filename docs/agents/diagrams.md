# Architecture diagrams

The README shows four diagrams, exported from archify sources. Each is committed twice: a static SVG the README displays, and the interactive HTML that GitHub Pages hosts at `https://pratham124.github.io/compound/architecture/<name>.html` (published by `.github/workflows/pages.yml`), linked under each picture.

| Diagram (`docs/architecture/`) | Source (`docs/diagrams/`) | Shows |
|---|---|---|
| `deployment.svg` | `architecture-deployment-*` | what runs where: phone, server roles, AWS and outside services |
| `modules.svg` | `architecture-modules-*` | the server's modules and what each owns |
| `plaid-webhook-flow.svg` | `sequence-plaid-webhook-*` | a Plaid webhook through to stored transactions |
| `sleep-recovery-note-flow.svg` | `sequence-sleep-recovery-note-*` | sleep arriving through to a recovery note |

`docs/agents/workflow.md` shows two more, made the same way:

| Diagram (`docs/architecture/`) | Source (`docs/diagrams/`) | Shows |
|---|---|---|
| `development-workflow.svg` | `workflow-development-workflow-*` | one milestone's tickets, from `/to-tickets` to merge |
| `ticket-orchestration.svg` | `sequence-ticket-orchestration-*` | how `/ticket` runs the builder and Neon's reviews |

A PR that changes something a diagram shows updates that diagram in the same PR, using the archify skill. That includes PRD-only PRs, which is where architecture usually changes first. Examples: adding a module or service, moving a responsibility between modules, or adding or reordering a step in either flow.
- **The sources aren't in git.** `docs/diagrams/` is listed in `.git/info/exclude`, so the sources exist only in Pratham's main checkout. In a worktree, copy the source folder in first. Copy it back to the main checkout when you're done, because the main checkout is their only home. A worktree without them, such as one `/ship` works in, can only flag a stale diagram, not redraw it.
- **Edit the source, not the SVG.** Start archify from the existing `candidate.json`, so the layout and style carry over, then run `finalize`. If that HTML already has browser-check results, pass `--out-dir <folder>/review-<n>`.
- **Export from the viewer.** Open the HTML and use its export menu's **SVG · Auto** item, which follows the reader's light or dark theme. The CLI has no SVG export, and the current SVGs came from that menu. Write the SVG back to the same `docs/architecture/` file, because the README links to those paths.
- **Copy the HTML too.** Copy the finalized HTML to `docs/architecture/<name>.html`, the same name as its SVG. Pages serves that copy, so skipping it leaves the interactive version stale while the README picture is current.
- **Same folder, no new timestamp.** Update the source folder where it is.
- **Say so in the PR.** Name the diagram you updated in the PR description, or say why no diagram changed.
