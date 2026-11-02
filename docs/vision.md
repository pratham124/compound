# Compound: Vision

Oct 31, 2026 · @Pratham

## The idea

**One place for my training, health and spending, which my AI assistant can read and reason across.**

Plenty of apps do workouts or budgets well. This one answers questions that need both, such as "do I order more takeout after bad sleep?" or "is my gym membership worth it, given how often I actually went?"

## Who it's for

Pratham first. After that, a small invite-only group, then anyone who's interested through a public launch.

## Goals

1. **Learn system design and build real interview material.** This is the main reason for the project.
2. **Make it good enough for many people to use.** Being useful to real people is a requirement, not a bonus.
3. **Design for 100k real users, and prove it under load with 100k synthetic users.** There's no target for how many real users sign up.

**When goals conflict:** learning wins, as long as the app stays good enough for real people to use.

## Non-goals

The app will never:

- Move money. Bank access is read-only.
- Give medical diagnosis or treatment advice.
- Give personalized investment or regulated financial advice.
- Sell user data or use it for advertising.

Chasing user growth is also not a goal.

## What comes first

**First version**

| Area | What it means here |
|---|---|
| Workouts | Logging and history |
| Passive health data | Sleep, steps and heart data from Apple Health |
| Money | Bank sync and spending |
| MCP | Your assistant can read and work with your data |
| In-app chat | A capped chat on a low-cost model, using the same tools as MCP |

The first version targets iPhone. The PRD picks the exact features and keeps each area thin.

**Later list**, roughly in this order:

1. Proactive AI: weekly check-in first, then adaptive plans, readiness and insights
2. Android
3. Screen time on Android only, because Apple keeps this data on the iPhone
4. Itemized food delivery from forwarded email receipts, or from Gmail after Google's verification and security assessment
5. Camera form check, as a separate project on a few key lifts
6. Social and motivation
7. Wild cards, with any money ideas as reminders or manual tracking
8. User-provided API keys, if in-app AI costs become a problem

Only the weekly check-in's first place was decided. The rest of the order is a starting suggestion, and when Android arrives is still open.

## How it launches

1. **Pratham only**, for at least 4 weeks of real use.
2. **Invite-only group**, free with usage caps.
3. **Public launch**, once privacy, account deletion and security work are done. A paid upgrade for bank sync and more in-app chat is added before this stage.


Full reasoning is kept in a local decision record, outside this repo.
