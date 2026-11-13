# Anti-slop provenance

- **Source:** the `install-anti-slop` skill bundle at `~/.claude/skills/install-anti-slop/assets/anti-slop/`, installed on 2026-11-12 with `node <skill>/scripts/install.mjs`. The bundle carries no upstream repository URL or commit, so the upstream revision is **unknown**.
- **Installed paths:** `index.ts` (generic plugin, registered as `anti-slop` in `.oxlintrc.json`), `rules/`, `shared/`, `vendor/eslint-stylistic/` (has its own `UPSTREAM.md` and `LICENSE`), and the opt-in `effect/` plugin (not registered: the repo has no direct `effect` dependency).
- **Deviations from the bundle:** none. The files are byte-for-byte as copied.
- **Dependencies:** `oxlint` and `@oxlint/plugins`, both pinned to 1.93.0 in the root `package.json`.
- **Local policy:** every generic rule plus `oxc/no-accumulating-spread` is at `error`. See `docs/lint-policy.md`.
