# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Users

One real user for now: Pratham, on an iPhone. He logs workouts at the gym, lets Apple Health collect sleep, steps, resting heart rate and HRV in the background, links his bank read-only, and asks an AI assistant questions that span all three.

The app is still built as if other people were coming: each person's data is kept separate (tenant isolation under row-level security), and accounts will be deletable in the app (planned for a later milestone). An invite-only group and a public launch are optional later stages with plans ready, not commitments.

## Product Purpose

One place for training, health and spending, which an AI assistant can read and reason across. Success is that it answers questions no single-purpose app can, such as "do I order more takeout after bad sleep?" or "is my gym membership worth it, given how often I actually went?", while each area stays good enough to use daily on its own.

The project's first goal is learning system design; when goals conflict, learning wins, as long as the app stays good enough for real people to use. Chasing user growth is not a goal.

## Positioning

Workouts, passive health data and spending live in one account, under one consent model, so the in-app chat and connected assistants can reason across them. Plenty of apps do workouts or budgets well; this one exists for the questions that need both.

## Operating Context

- Five tabs: Today, Train, Money, Trends, Chat. Settings opens from the profile button on Today.
- Workouts are logged live at the gym, mid-set, often one-handed and offline; the logger must work without a connection and sync later.
- Health data arrives without typing, synced from Apple Health while the phone is unlocked.
- A draggable chat button with its own character sits at a screen edge on four tabs and opens a quick-chat sheet; it is hidden on Chat, Settings, single-confirm task screens, during an active workout and while the keyboard is up.
- The AI proposes changes in chat; a change runs only when its confirm button is tapped, and every AI change appears in an AI changes list with Undo.
- Recovery notes are AI-written suggestions for a lighter day, sent without being asked.

## Capabilities and Constraints

- Full scope, terms and exact numbers: `docs/prd/README.md` and its appendices (`numbers.md`, `tool-catalog.md`, `categories.md`, `wording.md`).
- Never moves money; bank access is read-only through Plaid.
- Never gives medical diagnosis or treatment advice, nor personalized investment or regulated financial advice.
- Never sells data or uses it for advertising.
- AI reads each area only after its sharing switch is turned on; all are off by default.
- The exact text of consent screens, confirm buttons, notifications and limit messages is fixed in `docs/prd/wording.md` and changes only on purpose.
- Stack: Expo (React Native) with Expo Router, Reanimated and Gesture Handler; a Fastify server with Postgres. iOS is the only target in the first version.
- Delete account is designed (hold to delete) but deletion itself is a later milestone; until then the row only explains that it isn't available.

## Brand Commitments

- Name: Compound. The mark is a cent sign whose top bar is a flexed arm; the app icon is the same mark drawn as soft clay. Files and their uses: `docs/brand/README.md`.
- The visual reference for app screens is the mockups in `docs/design/mockups/` (index.html holds every screen); app tokens live in `apps/mobile/src/theme/tokens.ts`.
- Voice: plain words, no lifting or finance jargon in user-facing names ("recovery note", not "deload"). Explain directly, never with hype.
- Public docs describe the project's purpose as learning system design.

## Evidence on Hand

- Product spec: `docs/prd/README.md`; vision: `docs/vision.md`.
- Screen mockups for every first-version screen: `docs/design/mockups/`.
- Brand assets: `docs/brand/`.
- No users beyond Pratham, no testimonials, press, benchmarks or pricing. Future work must not invent any.

## Product Principles

1. Cross-domain answers are the point; each area must still stand on its own in daily use.
2. Data is the person's: read-only bank access, switches off by default, nothing sold, deletion in the app.
3. The AI suggests and the person confirms; every AI change is visible and undoable.
4. Built for many, used by one: isolation is real now, even with one user, and in-app deletion is planned.
5. Plain language over jargon, everywhere a person reads.

## Accessibility & Inclusion

Dynamic Type up to the largest accessibility sizes, VoiceOver labels on every control, and iOS Reduce Motion honored (movement removed, opacity and colour changes kept). Touch targets are at least 44pt.
