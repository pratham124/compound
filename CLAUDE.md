# Compound

## TypeScript

Before editing any `.ts` or `.tsx` file, read pstack's `typescript-best-practices` skill and follow it. That's `SKILL.md` plus `references/patterns.md`, under `~/.claude/plugins/cache/*/pstack/<newest>/skills/typescript-best-practices/`. Read the `principle-type-system-discipline` skill it names first. The skill is marked so it can't be invoked, and `/poteto-mode` doesn't load it, so without this line its rules (discriminated unions, branded IDs, no `as` casts, exhaustive `never` checks, parsing at boundaries) wouldn't apply. Read them once per session, not per file. When handing TypeScript work to a subagent, tell it to do the same.

## Stack skills

Use these skills when writing or reviewing code in each area. Follow them where the PRD or this file doesn't already decide, because they cover framework rules the general skills don't. When handing work to a subagent, name the ones its files need.

- **Fastify server (`apps/server/`):** `fastify-best-practices`, for example each module being its own Fastify plugin.
- **Expo app (`apps/mobile/`):** `vercel-react-native-skills`. Before building or changing a screen, open its mock from `docs/design/mockups/index.html` and match it.
- **Motion, gestures and sheets in the app:** `animate-expo`, never the web motion skills (`animate`, `gestures`, `choreograph`), because their CSS and Motion code doesn't carry over to React Native. Review motion against `animate-expo`'s rules too.
- **`break-ui` on a screen:** put the worst-case data behind a dev-only fixture switch in `apps/mobile/app/dev-fixtures.tsx` instead of a web toggle, and test the largest text size instead of browser zoom.
- **`find-animation-opportunities` on a screen:** skip its web-only sweeps (`:active`, `display: none`) and give its values as Reanimated settings.

## Code comments

Don't write a comment that restates what the code already says, such as explaining what `SplashScreen.setOptions({ fade: true, duration: 200 })` does or why 200ms was picked. Comment only what a reader couldn't get from the code: a hidden constraint, a workaround, or a choice someone would otherwise "fix". The reasoning behind a choice goes in the PR description. When handing work to a subagent, tell it the same.

## Architecture diagrams

A PR that changes what one of the README's four diagrams shows (a module or service, a responsibility moving between modules, a step in either flow) updates that diagram in the same PR, PRD-only PRs included. Follow `docs/agents/diagrams.md`: the archify sources live only in the main checkout, and the export steps aren't guessable. Name the diagram in the PR, or say why none changed.

## Where tests live

Put each test file next to the file it tests, named `<file>.test.ts`, such as `apps/mobile/src/auth/signIn.test.ts` beside `signIn.ts`. A module's tests and test helpers stay in its folder, so a module isn't split across two trees, and a file with no test beside it stands out. A test may cover several files of one module and sit in that module's folder, such as `apps/server/src/identity/signIn.test.ts`, but `pnpm lint` fails a test that imports nothing from its own package (`apps/<name>/`, `packages/<name>/`, `infra/<name>/`, or a top-level folder). The server's test script runs `src/**/*.test.ts`, and the mobile Jest config only looks under `apps/mobile/src/` (`roots` in `jest.config.js`), so a mobile test anywhere else never runs.

- **Never in `apps/mobile/app/`.** Expo Router turns every file there into a screen, so a test there becomes a route. Keep screens thin and test the logic they call, under `apps/mobile/src/`.
- **Whole-system tests get their own top-level folder,** as `loadtest/` does, because they test the running system rather than one file.

## Tests: break each one once

Before keeping a new test, break the behaviour it names (temporarily, with Edit) and confirm the test fails, then say in the PR which break you tried. The full rules on vacuous, redundant and flaky tests and on property tests for the promises are in `CODING_STANDARDS.md`; the reviewer enforces them.

## Starting a ticket

Start each `ready-for-agent` issue from a session on `main` with `/worktree <n>`, which opens the issue's worktree and moves the session into it. Then run `/ticket <n>` there. It claims the issue, then a builder agent builds it test-first, one acceptance criterion at a time, and a separate reviewer agent reviews it with Addy Osmani's skills, at most twice. It stops for you to review the branch before `/no-mistakes`. Both are user skills in `~/.claude/skills/`. For parallel tickets, use one pane per ticket. A hook, `.claude/hooks/require-worktree.mjs`, blocks edits to tracked files in the main checkout, because other sessions work there. Gitignored files are still editable there.

## Verification and shipping

Ship every PR through `/no-mistakes`; a hook blocks a bare `gh pr create` unless the body has `Skipped no-mistakes: <reason>`. Read `docs/agents/verification.md` before an `axi run`, when a PR implements a promise from its "Promises to verify" list or touches code in a formal check's `covers.txt`, and at the end of each milestone (both maintain sweeps). It also covers `verify-compound`, `depends.txt` and the `No verification update:` escape.
