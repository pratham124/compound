# Coding standards

The reviewers apply these: the /ticket reviewer and the /ship review of changes made after the handback. Authors follow them too, but this file is read at review time rather than loaded every turn.

## Tests: no vacuous or redundant ones

Every test must be able to fail when the behavior it names breaks, and no two tests should guard the same thing. A test that can't fail costs run time and upkeep while proving nothing, and duplicates make every behavior change edit several tests. This applies to the author and to the reviewers: raise each vacuous or redundant test as a finding.

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

**Flaky tests:** don't add a sleep, a retry, a longer timeout or a skip to make a test pass. A test that passes on a rerun teaches the next agent to rerun instead of fix. Find the race or the shared state. If you can't find the root cause, delete the test and give what you tried in the commit message.

**Property tests for the promises:** each promise under "Promises to verify" also gets a fast-check property test of the real code, in the PR that implements it, next to the code like any other test. Generate the inputs, such as replay orders, overlapping webhook pages, or sequences of spending, and assert the promise itself. Examples: replaying a batch twice leaves the same state as replaying it once, the stored transactions don't depend on how the pages overlap, and an alert fires at most once per category per month. The same goes for parsing at a boundary: parsing then serializing returns the original. Generated inputs don't share the author's blind spots the way hand-picked examples do.
