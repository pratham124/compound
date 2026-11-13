## Summary

<!--
One or two sentences: what this changes and why, in the app's plain words (no lifting or finance jargon).

Then the smallest view that makes the change clear. Usually one, rarely two:
- pseudocode for logic or an algorithm
- a call tree for runtime control flow
- a component tree for UI structure, with the state and module boundaries that matter
- a shallow file tree for a new layout or a broad refactor
- a Mermaid sequence diagram for how parts talk to each other
- a ```diff of one of the above, when the shape already exists and the point is what changes

Keep only the calls, files, props and states a reader needs.
-->

## Evidence

<!--
Before and after. Screenshots when the change is visual and you can take them.
Otherwise the exact test that failed before and passes now (as pseudocode), or command output.
For each new test, name the break you made to see it fail.
-->

- **Before:**
- **After:**

## Merge danger

**Door:** <!-- two-way: a revert fully undoes it. one-way: it can't be cleanly undone (data migrations, deletes, anything already sent to users or a third party). -->

**Blast radius:** <!-- one word, then what could break if this is wrong -->

## Diagrams

<!-- Name the docs/architecture/ diagram this PR updated, or say why none changed. -->

Closes #<!-- the issue number from the branch name; delete this line if there's no issue -->
