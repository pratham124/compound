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
| Workouts | An offline logger with past workouts, PRs, a rest timer and saved routines, using an exercise database, plus AI-written deload messages |
| Passive health data | Sleep, steps, resting heart rate and HRV from Apple Health, shown on a Today card and one Trends screen beside your training |
| Money | Bank sync from checking, savings and credit cards, with spending sorted into Compound's own categories, a monthly view, budgets with alerts, and subscriptions Compound finds itself, shown in a list and calendar with cost per workout for a gym. Eating out spending joins the Trends screen |
| MCP | Your assistant can read and work with your data |
| In-app chat | A capped chat on a low-cost model, using the same tools as MCP |

The first version targets iPhone. AI runs only when someone asks, with one exception: deload messages. The PRD picks the remaining features and keeps each area thin.

**Later list**, roughly in this order:

1. More proactive AI: weekly check-in first, then adaptive plans, readiness and insights
2. Android
3. Screen time on Android only, because Apple keeps this data on the iPhone
4. Itemized food delivery from forwarded email receipts, or from Gmail after Google's verification and security assessment
5. Camera form check, as a separate project on a few key lifts
6. Voice logging, and writing workouts back to Apple Health
7. Social and motivation
8. Wild cards, with any money ideas as reminders or manual tracking
9. User-provided API keys, if in-app AI costs become a problem

Only the weekly check-in's first place was decided. The rest of the order is a starting suggestion, and when Android arrives is still open.

## How it launches

1. **Pratham only**, for at least 4 weeks of real use, with secrets kept out of the repo, data encrypted and MFA on every admin account.
2. **Invite-only group** of around 15 to 20 people in the US and Canada, free with usage caps, through TestFlight. It stays on Plaid's free trial, which allows 10 bank logins over the app's whole life, so only about 6 invitees get bank sync. The rest use everything else without it. People here get the same data protection as public users: in-app account deletion, separate permission before their health or bank data goes to AI, encrypted tokens and an incident plan.
3. **Public launch**, once a company owns the App Store account and Apple's and Plaid's reviews have passed. Before this stage, Compound forms the company, applies for Plaid's paid plan, and adds a paid upgrade for bank sync and more in-app chat.


Full reasoning is kept in a local decision record, outside this repo.
