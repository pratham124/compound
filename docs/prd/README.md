# Compound: first-version PRD

Nov 4, 2026 · @Pratham · Status: ready to build

Compound is one place for my training, health and spending, which my AI assistant can read and reason across. This PRD says exactly what the first version does and how we judge that it's done, so building can start with nothing left to decide. It's written from the [vision](../vision.md).

The PRD is this file plus four appendices:

| File | What it holds |
|---|---|
| [numbers.md](numbers.md) | Every number the app reads from config, with its starting value, where the value came from, and what replaces it |
| [tool-catalog.md](tool-catalog.md) | The 15 tools the in-app chat and assistants call, with inputs, outputs and scopes |
| [categories.md](categories.md) | Compound's 14 spending categories and the mapping from Plaid's detailed categories |
| [wording.md](wording.md) | The exact text of consent screens, write cards, notifications and limit messages |

## Contents

1. [Goals and non-goals](#1-goals-and-non-goals)
2. [Who it's for](#2-who-its-for)
3. [Terms](#3-terms)
4. [How the app is laid out](#4-how-the-app-is-laid-out)
5. [Workouts](#5-workouts)
6. [Passive health data](#6-passive-health-data)
7. [Deload messages](#7-deload-messages)
8. [Money](#8-money)
9. [Notifications](#9-notifications)
10. [In-app chat and assistants](#10-in-app-chat-and-assistants)
11. [Accounts, privacy and security](#11-accounts-privacy-and-security)
12. [Architecture](#12-architecture)
13. [Scale and the load test](#13-scale-and-the-load-test)
14. [Milestones](#14-milestones)
15. [Cut list](#15-cut-list)
16. [Known limits](#16-known-limits)
17. [Not in the first version](#17-not-in-the-first-version)

## 1. Goals and non-goals

**Goals**, in priority order:
1. Learn system design. This is the main reason for the project.
2. Be good enough for many people to use.
3. Be designed for 100k real users, and prove it under load with 100k synthetic users.

When goals conflict, learning wins, as long as the app stays good enough for real people to use.

**Non-goals.** Compound never moves money (bank access is read-only), never gives medical diagnosis or treatment advice, never gives personalized investment or regulated financial advice, and never sells data or uses it for advertising. Chasing user growth isn't a goal.

## 2. Who it's for

The first version is built for one real user: Pratham, on an iPhone. It commits only to the **Pratham-only stage**. An invite-only group and a public launch are optional later stages. Their privacy and Plaid plans exist, but this PRD doesn't require them.

Two things are still built as if other people were coming, because they're the system design practice and they make later stages cheaper: keeping each person's data separate (tenant isolation), and in-app account deletion.

## 3. Terms

- **Logger**: the screen where you record a workout's exercises, sets, reps and weight as you do it.
- **Routine**: a saved workout you can start again, with exercises and target sets and reps.
- **Exercise list**: the named exercises people pick from, so the same lift always counts as the same lift.
- **Training volume**: for one day, the sum of reps × weight over all logged sets. Sets with no weight count their reps × 0 and so add nothing; they still count as a workout day.
- **PR (personal record)**: for one exercise, the heaviest weight lifted at each rep count from 1 to 12, plus the best estimated one-rep max (Epley: weight × (1 + reps / 30)).
- **Passive health data**: sleep, steps, resting heart rate and HRV, read from Apple Health without typing.
- **Health sync**: the phone sending new Apple Health data to the server whenever Apple Health saves it while the phone is unlocked.
- **Daily summary**: one person's numbers for one day, built on the server from stored samples.
- **Sleep night**: the sleep that counts as "last night" for a day (section 7).
- **Baseline**: a person's own recent average for one measure, which a deload check compares against.
- **Deload message**: an AI-written note suggesting a lighter workout or rest day, sent without being asked.
- **Bank login**: one sign-in at one bank through Plaid, which can cover several accounts.
- **Spending**: money going out to merchants, not counting transfers between your own accounts or credit card and loan payments.
- **Category**: one of Compound's 14 spending groups ([categories.md](categories.md)).
- **Merchant rule**: a person's choice that every transaction from one merchant gets a given category.
- **Subscription**: a charge Compound found repeating from one merchant at a regular interval and similar amount, or one a person marked.
- **Tool**: one named action the in-app chat or an assistant can call on Compound's server.
- **Write card**: the in-app chat's preview of a change, with Apply and Cancel.
- **AI changes list**: every change made by the chat or an assistant, with Undo.
- **Chat allowance**: how much in-app chat a person can use per day, measured by real model cost.
- **Scope**: one permission a person grants an assistant on Compound's consent page.
- **Starting value**: a number in config that this PRD commits to now, with the measurement that will replace it ([numbers.md](numbers.md)).

## 4. How the app is laid out

Five tabs: **Today**, **Train**, **Money**, **Trends**, **Chat**.

| Tab | What's on it |
|---|---|
| Today | The deload card when there's a message, the Today card (last night's sleep, steps, resting heart rate, HRV, when health sync last ran), a Start workout button, and a profile button that opens Settings |
| Train | Start a routine or an empty workout, the logger, past workouts, PRs, routines, the exercise list |
| Money | The this month view, the transaction list, budgets and subscriptions (list and calendar) as sections. Without a bank login, one screen explaining what linking adds, with a Link bank button |
| Trends | 30 days of sleep, resting heart rate and HRV next to training volume, deload messages marked, and daily Eating out spending as bars when a bank is linked |
| Chat | Past conversations and full-screen chat |

**Chat button.** On the other four tabs, a chat button with its own character sits at a screen edge.
- It can be dragged anywhere. On release it snaps to the nearest side edge and remembers where it was left, stored as an edge plus a fraction of the screen height, so it survives different screen sizes.
- Tapping it opens a quick-chat sheet over the current screen. The chat is told which screen it was opened from and the selected item's id (for example, a transaction), nothing more.
- A conversation started from the button also appears in the Chat tab's history.
- It's hidden on the Chat tab, during an active workout and while the keyboard is up.
- It has a small idle animation, which stops when iOS Reduce Motion is on, and a VoiceOver label ("Ask Compound").

**Settings** holds: AI and assistants (sharing switches, connected assistants, the AI changes list), Notifications (switches per kind, quiet hours), Connections (Apple Health, bank logins), and Account (sign out, delete account).

## 5. Workouts

**User stories**
- As Pratham, I can start a saved routine or an empty workout and log sets, reps and weight with no signal at the gym, and it syncs later without ever saving a set twice.
- As Pratham, I see what I did last time for each exercise while I log.
- As Pratham, I see my PRs per exercise, and the logger marks a set that beats one.
- As Pratham, I can start a rest timer between sets.
- As Pratham, I can save a workout as a routine, and build routines by hand.
- As Pratham, I can pick exercises from a large list with instructions and images, and add my own.
- As Pratham, my Apple Health workouts (for example a run recorded by my watch) appear in past workouts.

**Requirements**
- **Offline first.** Starting a routine, logging, editing and finishing a workout all work with no connection. Logger data lives in a local database on the phone with a local upload outbox. Every upload carries an idempotency key, so a retry never creates a duplicate. When the same item is edited on two devices, the last write wins.
- **Exercise list.** A copy of [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense, 800+ exercises) is owned by Compound from then on. Text ships inside the app. Images download when first viewed and are then cached. Custom exercises have a name (up to 60 characters), a primary muscle and equipment.
- **Units.** Weight is stored with its unit (kg or lb). Pratham picks a display unit in Settings.
- **Apple Health workouts** are read in as past workouts with type, duration and energy. They count as workout days but add no training volume, since they have no sets.
- **Routines** can be created by hand, saved from a finished workout, or saved by the chat or an assistant after confirmation (section 10).
- **Next-set help** is only last time's numbers. Overload advice comes from asking chat.

## 6. Passive health data

**User stories**
- As Pratham, Compound reads my sleep, steps, resting heart rate and HRV from Apple Health in the background, without opening the app.
- As Pratham, the Today card shows last night's numbers and when health sync last ran, so I can tell when sync has stopped.
- As Pratham, the Trends screen shows my recovery next to my training over 30 days.

**Requirements**
- **Data read:** sleep (time asleep and in bed, with stages when a wearable records them), daily steps, resting heart rate and HRV (SDNN). All-day heart rate samples are not read.
- **Health sync** uses Apple Health observer queries with background delivery, registered natively at app launch through `@kingstinct/react-native-healthkit`. The completion handler is always called, so Apple doesn't stop delivery.
- **What the phone sends:** sleep segments, resting heart rate and HRV readings as Apple Health stores them, with their source, plus deletions. Steps go up as hourly totals. Uploads can repeat without creating duplicates.
- **What the server keeps:** every sample, stored in day buckets (one row per person, day and type). An upload marks that person and day as needing a rebuild, and a worker rebuilds daily summaries in batches.
- **History on connect:** the last 90 days, or the shorter window the person grants. Older history is not imported.
- **Two sleep sources on one night:** the source that records sleep stages wins. If both or neither do, the one with more time asleep wins.
- **Missing data** shows as missing, never as zero. If no data of a type has ever arrived, the Today card says so and links to the Health permission settings, since an app can't tell "denied" from "no data".
- **Trends** draws empty days as gaps and works offline from the last saved data.

## 7. Deload messages

The one feature where AI runs without being asked.

**User stories**
- As Pratham, on mornings when my recovery and training together suggest it, I get a short note suggesting a lighter workout or a rest day, with the numbers behind it.
- As Pratham, I can turn these messages off.

**When a check runs**
- **Sleep night:** sleep that ends between 6 pm and noon local time is credited to the morning it ends. Sleep under 3 hours that ends after noon is a nap and is ignored.
- **Sleep has arrived** when last night's sleep exists and no new sleep has uploaded for 30 minutes.
- A **15-minute tick** runs the check for everyone whose sleep has arrived and who hasn't been checked today.
- At the **11:00 local cutoff**, anyone not yet checked gets a training-only check. Its message says sleep data wasn't available. Missing data is never treated as bad sleep.
- Checks run only for people who are **recently active**: a workout logged in the last 7 days.
- The check rebuilds that person's daily summary first if it's still waiting for a rebuild.
- Each person is checked at most once a day. The per-day claim records `claimed` and `done`, so a job delivered again after a crash picks up where it stopped.

**What the check looks for.** Baselines are 14-day averages, and a measure is only checked when at least 10 of the last 14 days have data.

| Flag | Fires when |
|---|---|
| Short sleep | the 3-night average time asleep is 15% or more below baseline |
| High resting heart rate | resting heart rate is 5 bpm or more above baseline, two days running |
| Low HRV | the 3-day average HRV is 15% or more below baseline |
| Training jump | the last 7 days' volume is 30% or more above the weekly average of the 3 weeks before |
| No rest | 6 or more days in a row with a workout |

**When a message is sent:** two or more flags at once, in any mix. After a message there's a 3-day quiet period with no new deload message. All thresholds are starting values ([numbers.md](numbers.md)).

**How the message is written**
- The AI sees only the check results (for example "sleep 18% below your 2-week average for 3 nights; training volume up 34%"), never the person's health history.
- It writes a short, plain message within general wellness: no diagnosis, no treatment, nothing that sounds medical.
- It's generated as a background job, stored on the server, shown as a card on Today, and sent as a push (section 9).
- **Spending cap:** unprompted AI spend has a global cap of $5 a month. Past it, a fixed template that lists the flags is sent instead ([wording.md](wording.md)).
- If deload messages are switched off, no check result goes to AI and nothing is spent.
- If Health sharing with AI is off, the AI sees only the training flags. If both are off, the template is used.

## 8. Money

**User stories**
- As Pratham, I can link my bank and see checking, savings and credit card transactions, with 180 days of history.
- As Pratham, each transaction has a category I can change, and I can make a merchant always use a category.
- As Pratham, I see this month's spending by category, compared with the same point last month.
- As Pratham, I can set monthly budgets per category, starting from suggested averages, and get alerts at 80% and 100%.
- As Pratham, Compound finds my subscriptions, shows them in a list and a calendar, flags price rises, and shows my gym's cost per workout.
- As Pratham, Trends shows my daily Eating out spending under my recovery lines.

**Bank sync**
- Plaid Link, limited to checking, savings and credit cards. Loans, lines of credit and investment accounts are out.
- On link, 180 days of history are requested.
- After that, Plaid's `SYNC_UPDATES_AVAILABLE` webhook triggers `/transactions/sync` with the saved cursor. There's no paid refresh. Pull-to-refresh re-reads only what the server has.
- A webhook only sets `sync_requested_at` on the bank-login row, and adds an outbox row if no sync is already pending. The sync loops until there's no newer request. It writes the transactions, the cursor, the per-day spending totals and any budget-alert job in one database transaction.
- Webhooks are verified (ES256 JWT, `iat` within 5 minutes, body SHA-256).
- Pending charges are shown and counted. When the posted version arrives, it replaces the pending one and keeps any category edit, matched on `pending_transaction_id` where the bank provides it.
- Every bank login shows when it last synced.
- Disconnecting a bank calls Plaid's `/item/remove` and deletes that login's data.

**Categories.** 14 categories mapped from Plaid's detailed category; full list and mapping in [categories.md](categories.md). The original Plaid category is always stored. A per-transaction edit or a merchant rule always beats the mapping.

**Screens**
- **Transaction list:** merchant, amount, date (the authorized date), category, a pending marker, search, and a category edit that offers "just this one" or "always for this merchant".
- **This month view:** spending by category for the current month, and month-to-date compared with the same point last month. Income and Transfers are not spending.

**Budgets and budget alerts**
- A monthly budget per spending category, shown as progress on the this month view.
- Setup suggests each category's average over the last 3 full months. Each suggestion can be accepted, edited or skipped.
- Alerts fire at 80% and 100%, checked inside the bank sync that crosses the threshold, at most once per category per month. They're written from a template, not by AI.
- Pending charges count toward budgets.

**Subscriptions**
- **Detection** reruns as transactions sync. A merchant is identified by Plaid's `merchant_entity_id`, falling back to the cleaned merchant name. It's a subscription when:
  - there are 3 or more charges from that merchant;
  - the gaps between charges are 6 to 8 days (weekly) or 26 to 35 days (monthly);
  - each amount is within 10% of the median amount, or $1 if that's larger.
- Groceries, Eating out, Coffee, Transport, Income and Transfers are never auto-detected.
- **Edits:** "Not a subscription" stops detection for that merchant for good. "Mark as subscription" works on any charge and asks for the interval (weekly, monthly or annual). Annual subscriptions are found only this way until someone has a year of history.
- A subscription becomes **inactive** after 1.5 intervals with no charge.
- A **price-change flag** appears when a renewal is at least 5% and $0.50 higher than the one before.
- **List:** merchant, amount, how often, next expected date, monthly cost, with the edits above.
- **Calendar:** a month view of expected renewals, inside the app only.
- **Cost per workout:** a subscription in the Gym and fitness category shows this month's charge divided by workouts logged this month.

**Trends.** Daily Eating out spending as bars under the recovery lines, by authorized date.

## 9. Notifications

Two kinds of push: **deload messages** and **budget alerts**.

- **Permission** is requested the first time a kind becomes possible (a baseline is ready, or the first budget is saved), never at sign-up, behind a short explanation screen first ([wording.md](wording.md)).
- **Switches:** one per kind on the Notifications screen, both on by default. The in-app card or the budget progress always appears either way.
- **Quiet hours:** shared by both kinds, 10 pm to 7 am by default, editable. A push due during quiet hours is held and sent when they end. One held push per kind; a newer one replaces an older one.
- **Lock screen** text is generic and never shows numbers or merchants ([wording.md](wording.md)).
- **Sending:** directly to Apple's push service over HTTP/2 with a token signing key. A device token Apple reports as unregistered is deleted.

## 10. In-app chat and assistants

**User stories**
- As Pratham, I can ask chat questions that need both health and money, such as "do I order more takeout after bad sleep?", and get an answer from my real data.
- As Pratham, I can ask chat to save a routine, log a workout I forgot, set a budget, relabel a purchase or mark a subscription, and I see what will change before it happens.
- As Pratham, I can connect Claude to Compound and ask the same things there.
- As Pratham, I can see every change AI made and undo it.
- As Pratham, I choose which kinds of my data the AI can read.

**Tools.** One tool module, used by both paths: 10 read tools and 5 write tools. Names, inputs, outputs and scopes are in [tool-catalog.md](tool-catalog.md).
- The MCP server exposes the module over HTTP, using the official TypeScript MCP SDK v2 in stateless mode.
- The in-app chat calls the same functions directly inside the backend.
- Every result carries a status block: when each source last synced, and a plain reason for any data kind left out.
- Text that came from outside (merchant names, custom exercise and routine names) sits in a clearly named `external` field. Tool descriptions say it's data, not instructions.
- Write inputs are strict: categories from the list, existing exercise ids, amounts in range, short names.
- Tools return daily summaries, never raw samples, and never account numbers, names or emails.

**Confirming writes**
- **In-app chat:** a write card with Apply and Cancel appears before each write runs ([wording.md](wording.md)).
- **Assistants:** the assistant's own approval prompt is the confirmation. Write tools are annotated `readOnlyHint: false`, `destructiveHint: false`; read tools `readOnlyHint: true`; all four hints are set explicitly.

**AI changes list and Undo**
- Every AI-made change records its source (in-app chat, or which assistant), its before-state and what it wrote. Entries are kept 90 days.
- Each entry is **applied**, **undone**, or **changed since**. Undo restores the before-state only if the current value still matches what the AI wrote. Otherwise the entry shows "changed since" and Undo is disabled.
- Undoing `log_workout` deletes that workout. It's the only delete AI can cause.
- Undoing a merchant rule removes the rule and restores only the transactions that still hold the rule's category.

**AI sharing switches** (in-app chat and deload messages)
- Three switches: Workouts, Health, Money. Each is off until turned on.
- The first time chat needs a kind that's off, it shows a one-time prompt to turn it on. If declined, the tool returns "not shared with AI" and chat says what it can't see.
- A single server flag can turn off all Apple Health-derived data for AI and assistants at once, in case Apple decides an AI provider doesn't count as a health or fitness service.

**Connecting an assistant (MCP)**
- Compound runs its own OAuth 2.1 authorization server with better-auth. The login page is Compound's sign-in.
- Client ID Metadata Documents come first, with Dynamic Client Registration off unless needed. PKCE S256 is required. Refresh tokens rotate, and responses include `iss`.
- Protected Resource Metadata's `resource` exactly matches the MCP URL. Real 401 challenges are sent. Tokens are checked to have been issued for the MCP server, and are never passed on to Plaid.
- Assistant tokens are opaque and stored hashed in Postgres, looked up on each call.
- **Scopes:** `workouts:read`, `health:read`, `money:read`, `workouts:write`, `money:write`. They're shown as checkboxes on the consent page. Tools outside the grant don't appear in `tools/list`. A write without a write scope gets a step-up `403 insufficient_scope`.
- Settings lists each connected assistant with its scopes and last use, and a Disconnect button that revokes its tokens at once.
- **Tested end to end:** Claude, reads and writes on a real account. ChatGPT gets a one-time read-only test.

**In-app chat**
- **Model:** `claude-haiku-5-5` at low effort, behind a model-provider adapter. M7 replaces this with an eval (section 14).
- **Chat allowance:** $0.10 per person per day, measured from each model call's token usage.
  - Before a call, the worst-case cost is reserved. After it, the real cost is settled.
  - It shows as a bar with no numbers. A heads-up appears at 80%.
  - At 100%, chat pauses until local midnight and suggests connecting an assistant.
  - Deload messages don't count against it.
- **Topics:** the person's own data plus general training, recovery and money-habit questions. Anything else gets a short, polite decline. Chat says it's AI in every conversation.
- **History:** conversations are kept on the server for 90 days, listed in the Chat tab, and can be deleted one at a time. There's no memory across conversations, but three seams make it addable later:
  - one context builder feeds every model request;
  - messages are stored as separate parts with their tool calls and results;
  - deletion and expiry treat chat as its own area.

**MCP rate limit.** A token bucket per person, shared by all their assistants: 60 calls a minute, 2,000 a day. Over the limit, tools return "too many requests, try again in N seconds".

## 11. Accounts, privacy and security

**Sign-in** is Sign in with Apple plus email one-time codes, with no passwords. The same sign-in serves the MCP consent page. Phone sessions are opaque tokens looked up in Valkey, kept in the phone's SecureStore.

**Pratham-only baseline**, required:
- no secrets or personal data in the repo; HTTPS only; encryption at rest;
- Plaid, model and push keys in a secrets manager;
- MFA on every AWS, GitHub, Plaid and Apple account;
- Plaid's Developer Policy followed;
- the HealthKit capability, usage descriptions and privacy manifests set from the first TestFlight upload;
- AI gets the least data that answers, chat says it's AI, and prompts stay within general wellness.

**Built anyway, as practice:**
- **Tenant isolation.** Every query is filtered by user id in the app. Postgres row-level security also refuses other people's rows, using a per-transaction `app.user_id`. System jobs get only a narrow function that returns user ids, then fan out into per-person jobs under the normal rules. Isolation tests cover screens, chat tools and MCP tools. CI fails if any table with a `user_id` lacks forced row-level security.
- **Account deletion** in the app. The account is locked and signed out at once. Within 24 hours a job deletes every row, removes bank logins from Plaid, revokes assistant and Sign in with Apple tokens, and cancels queued jobs. Backups age out within 35 days. The phone wipes its local database.
- **Data handling.** No personal data in logs, traces, metrics or error reports. No analytics or ad SDKs. The phone's local database is excluded from iCloud backup.

The invite-only and public stages add more (a privacy policy, encrypted tokens with a key-management service, an incident plan, an audit log and others). Those gates aren't part of this PRD.

## 12. Architecture

**Stack**
- **Repo:** one pnpm monorepo with `apps/mobile`, `apps/server`, `packages/contracts` (shared Zod schemas), `mocks/` (Plaid, model, push), `loadtest/`, `infra/` (Terraform) and `.github/workflows`.
- **Phone:** Expo SDK 58, `@kingstinct/react-native-healthkit` 16.x, `expo-sqlite` for the logger, and TanStack Query with a saved cache for other screens.
- **Server:** Node 24 and TypeScript, Fastify 5, Kysely with hand-written SQL migrations, and better-auth. Uses the official `plaid` client (pinned), `jose` for webhooks, and `ioredis` for Valkey.
- **AWS:** ALB, Fargate ARM, RDS Postgres, ElastiCache Serverless Valkey, SQS and EventBridge Scheduler.
- **Ops:** Terraform for both setups, GitHub Actions for CI and deploys, and OpenTelemetry to Grafana Cloud.

**Shape**
- A **modular monolith** of seven modules. Each is a Fastify plugin with its own tables, one data-access place and a small public interface. No module reads another module's tables.
- **One build, two process roles.** The api role serves HTTP. The worker role runs the outbox relay, queue consumers and tick handlers. Always-on runs both in one process; the load test runs them as separate services.
- **Background work:** the app writes an outbox row in the same commit as the change. A relay deletes it, sends it to SQS and commits. SQS standard queues have dead-letter queues. Recurring EventBridge Scheduler ticks wake workers to find due rows.
- **Seams:** every read goes through a module's data-access place, so a cache or replica plugs in there. Nothing beyond the required parts is built until a run proves it's needed.
- **Fast-counter seam:** phone sessions, the MCP rate limiter and the chat meter all go through one small storage interface. Only the Valkey version is built in the first version. A Postgres version can be added later without changing any caller ([section 17](#a-cheaper-just-me-setup-later)).
- **Keys:** every large table's key starts with `user_id`, and new ids are UUIDv7. Hot and cold data sit in separate tables (raw Plaid payloads, raw health arrays, chat parts and undo before-states are cold).

**What each module owns** (table columns and endpoints are left to the implementation plan):

| Module | Owns |
|---|---|
| identity | people, sign-in and phone sessions, time zone, display units, account deletion |
| workouts | exercise list and custom exercises, routines, workouts and sets, PRs, Apple Health workouts, per-day training totals |
| health | health samples in day buckets, daily summaries and the rebuild list, health sync status |
| money | bank logins and cursors, accounts, transactions and raw payloads, merchant rules, budgets and alert state, subscriptions, per-day spending totals |
| coaching | deload checks, per-day claims and deload messages |
| assistant | the tool module, MCP adapter and OAuth clients and tokens, AI sharing switches, chat conversations and parts, the chat meter, the AI changes list and before-states, the MCP rate limiter |
| notifications | device tokens, per-kind switches, quiet hours, held pushes, push sending |

The daily timeline is built at read time from the workouts, health and money modules' per-day tables, through their public interfaces. A nightly job checks the per-day tables against their sources.

## 13. Scale and the load test

**Two setups from the same Terraform definitions**
- **Always-on:** small and running every day for Pratham's real use. Single-AZ, with point-in-time backups and one rehearsed restore. Deploys have no downtime, and errors and queue backlogs alert Pratham's phone. Sizes are in [numbers.md](numbers.md).
- **Load-test:** created for each run and destroyed after it. A run is about 5 hours and about $14. It never holds real data. Plaid, the model and Apple's push service are replaced by mock services that record what they sent.

**Traffic shape** (100k synthetic accounts, a year of history each; 60% with bank sync, 70% with a wearable):
- **Everyday:** 40k active a day, each opening the app about 6 times and logging a workout about every other day.
- **Morning sleep wave:** uploads and per-person deload checks across US and Canadian time zones over about 3 hours.
- **Webhook storm:** every bank login gets a Plaid update within about 10 minutes (60k signed webhooks, then 60k cursor pulls).
- **Offline sync bursts:** phones replay queued sets after the gym, with deliberate duplicates.
- **Evening chat peak:** load on the rate limiter and the chat meter, against the mock model.

**Pass bar**
- **Everyday:** reads p95 under 300 ms and p99 under 1 s, writes p95 under 500 ms, errors under 0.1%.
- **Sleep wave:** 99% of deload checks finish within 15 minutes of that person's sleep arriving.
- **Webhook storm:** every bank login caught up within 15 minutes, with stored transactions exactly matching what mock Plaid sent.
- **Offline sync:** zero duplicate sets.
- **Chat peak:** everyone over the limit gets "try again in N seconds", and no allowance is overspent by more than 1%.
- **Throughout:** no person can read another's data, checked by running the isolation tests against the loaded system.

**A full run** ramps from the traffic shape past 100k to the breaking point and records which part failed first. That part is fixed, and a second run measures the fix. A cache, read replica or ClickHouse is added only when a run shows a bottleneck it fixes, with before and after numbers.

**Tools:** k6 with arrival-rate executors, run from AWS machines. A seed generator bulk-loads synthetic data. Verifiers compare the database with what the mocks recorded.

**CI smoke test**, on every merge, against Docker Compose (server, Postgres, Valkey, an SQS emulator and the three mocks):
- about 5 virtual users for about 1 minute, covering: a sleep upload then its deload check; a burst of 50 Plaid webhooks; an offline sync replay with repeated idempotency keys; and a chat turn on the mock model;
- passes when all four correctness verifiers pass (no duplicates, nothing missed, no overspend, no cross-person reads) and errors stay under 1%;
- has no latency gate.

**Cost guardrails:** AWS Budgets alerts at $75 and $150 a month. The run workflow always ends in destroy. A scheduled sweep destroys any load-test setup older than 8 hours and can never touch always-on. The vCPU and Fargate quota increase is requested before the first run.

**ClickHouse** stays out of the app. It joins only when Compound needs queries across all users, or when per-person trend reads miss the pass bar after summary tables, partitioning and a replica.

## 14. Milestones

Each milestone ends with something usable on the phone and deployed to the always-on setup.

| # | Milestone | Done when |
|---|---|---|
| M0 | Device test | On a real iPhone, an EAS development build is granted Health access and registers an observer. The app is killed, a new Health sample is added, and the woken app uploads it. If SDK 58 fails, fall back to SDK 57 and repeat. |
| M1 | Walking skeleton | The monorepo, Terraform for always-on, CI deploying main, OpenTelemetry reaching Grafana, sign-in, and one request from the phone through the api role to Postgres under row-level security. The first restore is rehearsed. |
| M2 | Workouts | Everything in section 5 works offline and syncs without duplicates. |
| M3 | Health | Section 6: health sync, daily summaries, the Today card and Trends. The 14-morning sleep-arrival measurement starts. |
| M4 | Money | Section 8, first on Plaid Sandbox, then with Pratham's real bank on Plaid's Trial. |
| M5 | AI | Section 10: tool module, in-app chat with write cards and the allowance, sharing switches, MCP with OAuth tested with Claude (reads and writes) and ChatGPT (read-only), and the AI changes list. |
| M6 | Deload messages and push | Section 7 and section 9. |
| M7 | Daily use and measurement | Daily use is met, and the starting values below are measured. The load-test tooling (seed generator, mocks, k6 scripts, verifiers) is built during these weeks. |
| M8 | Load test | The first full run passes the pass bar and ramps to the breaking point. The part that failed first is fixed, a second run measures the fix, and the ClickHouse comparison runs on the same seeded data. |

**Keeping deload messages.** Over 14 mornings during M3 to M6, sleep must reach the server within 1 hour of waking on at least 10 mornings. If it doesn't, cut-list item 7 is pulled early, and deload questions are answered only in chat.

**Daily use** means 28 days in a row on which every workout is logged in Compound and no bug that loses or duplicates data is open.

**Measured in M7:**
- **Model:** an eval of 30 real crossover questions, comparing `claude-haiku-5-5` with `claude-sonnet-5-5`. The cheaper model stays unless its answers are clearly worse.
- **Chat allowance:** set from the real cost per question in Pratham's use.
- **Deload thresholds:** tuned against the 4 weeks of real messages, including ones Pratham found wrong or annoying.
- **Unprompted AI cap:** set from the real cost per deload message.
- **Traffic shape:** refined from Pratham's real usage before the first run.

**The first version is done** when daily use is met and M8's pass-bar run has passed.

## 15. Cut list

If the build runs long, Pratham pulls the next item from this list, in order. The list fixes the order, not the moment.

1. The ClickHouse experiment
2. The subscription calendar view
3. The evening chat-peak spike in the load test
4. Budget alerts
5. The second run's ramp past the fix
6. Budgets
7. Deload messages (chat still answers the question)
8. The Trends screen

**Never cut:** the offline logger, health sync, bank sync, the tool module with in-app chat and MCP, account deletion and tenant isolation, and the pass-bar run.

## 16. Known limits

- **Health sync timing is up to Apple.** Data arrives only after the phone unlocks. A force-quit can stop background delivery, and the "last synced" line is the only signal.
- **Night-shift sleepers** get odd sleep nights, because the 6 pm to noon window assumes night sleep.
- **People without a wearable** get steps only, so their deload checks are training-only.
- **Annual subscriptions** are found only when marked by hand, until someone has a year of history.
- **Pending charges** can trigger or skip a budget alert when a hold never posts or a tip is added later.
- **Cash spending** is invisible to budgets and Eating out bars.
- **Cost per workout** misses unlogged gym visits and can't split a family membership.
- **Prompt injection** through bank-supplied text can't be ruled out. Strict write inputs, `external` fields and Undo limit the damage.
- **"Always allow"** in an assistant removes the human check on writes, leaving Undo and strict inputs.
- **Two-device edits** use last write wins.
- **Single-AZ:** a zone outage means downtime until it recovers or a restore runs.
- **The pass bar's numbers** are educated guesses, and mocks can drift from the real services.

## 17. Not in the first version

The later list, roughly in order:
1. More proactive AI: a weekly check-in first, then adaptive plans, readiness and insights, and chat memory across conversations
2. Android
3. Screen time on Android only
4. Itemized food delivery from forwarded receipts, or Gmail after Google's verification
5. Camera form check
6. Voice logging, and writing workouts back to Apple Health
7. Social and motivation
8. Wild cards
9. People's own API keys, if AI costs become a problem

Also out: account balances, per-category charts over time, savings goals, typing in cash purchases, receipt scanning, renewal reminders, calendar export, Plaid's paid refresh and Recurring Transactions add-on, direct Garmin, Whoop and Strava connections, editing or deleting past workouts through AI, and self-serve data export. The invite-only and public stages, with their gates, billing and company, are optional later work.

### A cheaper just-me setup, later

After M8, once the load-test results are in, the always-on setup can be trimmed if the bill matters more than matching the load-test setup. There are three cuts, and each can be taken on its own:

| Cut | Saves a month | How | Trade-off |
|---|---|---|---|
| Smaller task | about $7 | Fargate task down to 0.25 vCPU and 0.5 GB. One Terraform setting | Less headroom. Summary rebuilds share half as much CPU with requests |
| Valkey to Postgres | about $6 | Add the Postgres version behind the fast-counter seam (section 12) and remove Valkey | Every session check and meter update becomes a database query, and the always-on setup stops matching the load-test setup |
| No load balancer | about $22 | Put API Gateway's HTTP API in front of the task, through a VPC link and Cloud Map | Chat replies can't stream word by word and requests are cut off at 30 seconds. Chat would then show whole replies, or move to queued turns the app polls. Deploys don't drain connections ([research](https://github.com/pratham124/compound/issues/18)) |

With all three, always-on is about $25 to $30 a month. A task serving HTTPS itself, with no load balancer, isn't a cheaper alternative: a Fargate task gets a new public IP on every restart and can't keep a fixed one, so every deploy would mean a DNS change and an outage.

**Rough capacity** (a guess, not measured; the bottleneck is CPU on the 0.5 vCPU task and the db.t4g.micro database):
- **Always-on as specified:** about 1,000 to 5,000 people comfortably, and perhaps up to 10,000 before it needs the larger setup the load test uses. The 20 GB of storage holds about 20,000 person-years of data.
- **Trimmed:** roughly half that.
- **The real limits** come before the servers: Plaid's Trial allows 10 bank logins in total, and the chat allowance can cost up to about $3 per person a month.

A k6 run against a load-test setup at always-on size would replace this guess for a dollar or two.
