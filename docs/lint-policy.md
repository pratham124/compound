# Lint policy

Lint is Oxlint with the anti-slop rules (`.oxlintrc.json`, vendored in `tools/oxlint/anti-slop/`). It covers every package and `scripts/`. Every rule is at `error`, and CI runs `pnpm lint` with `--deny-warnings`, so any finding fails the build. Findings are fixed, never silenced: no `// oxlint-disable`, no lowering a rule's severity, no casts to get past a type rule.

Two rules need a policy because Expo changes how they apply.

## `no-module-mocking`

Tests never call `jest.mock` or `vi.mock`.

Native modules (HealthKit, SQLite, notifications and so on) are reached through a small interface that the code receives as an argument. A test passes a fake that implements the same interface. `fetchHealth` in `apps/mobile/src/api/health.ts` is the pattern: it takes `fetch` as an argument, and its test passes a plain function.

The only automatic mocking is the jest-expo preset's own setup. That lives in `node_modules`, outside our source, and the rule doesn't see it.

## `no-array-filter-map`

Both forms below replace `.filter(...).map(...)` so the array is walked once.

- **Server (`apps/server`, `packages/contracts`, `scripts/`):** Node 24 has iterator helpers. Write `.values().filter(...).map(...).toArray()`.
- **Mobile (`apps/mobile`):** use a single `flatMap` or a local reducer that pushes into a fresh array. Hermes support for iterator helpers has not been checked on the phone yet, and a missing helper crashes at runtime rather than at build time. Revisit once iterator helpers are confirmed on a device. Then mobile can use the same form as the server.
