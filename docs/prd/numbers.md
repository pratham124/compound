# Compound PRD: numbers

An appendix of the [PRD](README.md). Every number the app or its infrastructure reads from config. These are **starting values**: everything can be built and tested against them now, and the "Replaced by" column says what measurement changes them and when. A starting value isn't a final answer.

**Basis** says where each value came from:
- **decided**: chosen in an earlier decision, with alternatives weighed
- **researched**: from a checked source (prices, limits, docs)
- **arithmetic**: worked out from researched numbers
- **judgement**: a reasonable default nobody has measured yet. These are the guesses to watch.

Milestones (M0 to M8) are in [PRD section 14](README.md#14-milestones).

## Recovery checks

| Setting | Starting value | Basis | Replaced by |
|---|---|---|---|
| Baseline window | 14 days | decided | M7: tuned against 4 weeks of real messages |
| Data needed to check a measure | 10 of the last 14 days | decided | M7 |
| Short sleep | 3-night average ≥ 15% below baseline | judgement | M7 |
| High resting heart rate | ≥ 5 bpm above baseline, 2 days running | judgement | M7 |
| Low HRV | 3-day average ≥ 15% below baseline | judgement | M7 |
| Training jump | last 7 days' volume ≥ 30% above the weekly average of the 3 weeks before | judgement | M7 |
| No rest | 6 or more days in a row with a workout | judgement | M7 |
| Flags needed for a message | 2 or more | decided | M7 |
| Quiet period after a message | 3 days | decided | M7 |
| Recently active | a workout in the last 7 days | decided | M7 |
| Messages per person per day | at most 1 | decided | not planned |
| Sleep night window | sleep ending 6 pm to noon local, credited to the morning it ends | decided | not planned |
| Nap rule | under 3 hours and ending after noon | decided | not planned |
| Sleep "has arrived" | no new sleep upload for 30 minutes | judgement | M3 to M6 arrival measurement |
| Recovery sweep tick | every 15 minutes | decided | the M8 sleep-wave result |
| Cutoff for the training-only check | 11:00 local | decided | M7 |
| Recovery-note keep bar | Apple Health hands last night's sleep to the app within 1 hour of waking (by the phone's timestamp) on ≥ 10 of 14 mornings | decided | not planned |

## Notifications

| Setting | Starting value | Basis | Replaced by |
|---|---|---|---|
| Quiet hours default | 10 pm to 7 am local, editable | decided | not planned |
| Held pushes per kind | 1 (the newest replaces an older one) | judgement | not planned |
| Budget alert thresholds | 80% and 100% | decided | not planned |
| Budget alerts per threshold | once per category per month | decided | not planned |

## Money

| Setting | Starting value | Basis | Replaced by |
|---|---|---|---|
| History requested on link | 180 days | decided | not planned |
| Budget suggestion | average of the last 3 full months | decided | not planned |
| Subscription: charges needed | 3 | researched (Plaid calls a stream mature after 3) | M7: Pratham's real subscriptions |
| Subscription: weekly gap | 6 to 8 days | judgement | M7 |
| Subscription: monthly gap | 26 to 35 days | judgement | M7 |
| Subscription: amount tolerance | within 10% of the median, or $1 if larger | judgement | M7 |
| Subscription goes inactive | after 1.5 intervals with no charge | judgement | M7 |
| Price-change flag | ≥ 5% and ≥ $0.50 above the last renewal | judgement | M7 |
| Plaid webhook clock skew | `iat` within 5 minutes | researched (Plaid's docs) | not planned |

## Health

| Setting | Starting value | Basis | Replaced by |
|---|---|---|---|
| History imported on connect | 90 days | decided | not planned |
| Steps upload granularity | hourly totals | researched (Apple caps step delivery at hourly) | not planned |
| Summary rebuild tick | every 1 minute | judgement | M8 |
| Summary rebuild batch | up to 500 dirty days | decided | M8 |
| Trends window | 30 days | decided | not planned |

## AI

| Setting | Starting value | Basis | Replaced by |
|---|---|---|---|
| In-app chat model | `claude-haiku-5-5`, low effort | decided | M7: eval of 30 real crossover questions against `claude-sonnet-5-5` |
| Model prices used for the meter | Haiku 5.5: $0.10 in / $0.50 out per million tokens ($0.50 / $2.50 on prompts over 100K tokens); Sonnet 5.5: $2 / $10 | researched (Anthropic's price list, Nov 2026) | whenever prices change |
| Cache prices used for the meter | writes 1.25× normal input (5-minute lifetime), reads 0.1×: Haiku 5.5 about $0.125 and $0.01 per million tokens, Sonnet 5.5 $2.50 and $0.20 | researched (Anthropic's prompt caching docs, Nov 2026) | whenever prices change |
| Smallest cacheable start | 512 tokens on Haiku 5.5 and Sonnet 5.5; shorter starts silently don't cache | researched | whenever the model changes |
| Chat allowance | $0.10 per person per day, which is about 30 crossover questions at roughly $0.003 each | arithmetic | M7: real cost per question |
| Allowance heads-up | at 80% | decided | not planned |
| Allowance reset | local midnight | decided | not planned |
| Unprompted AI cap (recovery notes) | $5 a month across everyone; template message past it | decided | M7: real cost per message |
| MCP rate limit | 60 calls a minute and 2,000 a day per person, shared by all their assistants | judgement | M7 and the M8 chat-peak result |
| Chat history kept | 90 days | decided | not planned |
| AI changes list kept | 90 days | decided | not planned |
| Daily timeline range | up to 90 days per call | decided | not planned |
| Tool page size | transactions up to 200 per call, default 50 | judgement | M7 |
| Write input ranges | as listed in [tool-catalog.md](tool-catalog.md) | judgement | M7 |

## Infrastructure

| Setting | Starting value | Basis | Replaced by |
|---|---|---|---|
| Always-on Postgres | RDS db.t4g.micro (1 GB) plus 20 GB gp3, about $14 a month | decided (db.t4g.small, which the research called the safer minimum, costs about $12 a month more; a resize takes minutes and moves no data) | M7: move to db.t4g.small if memory or CPU runs short |
| Always-on compute | one Fargate ARM task, 0.5 vCPU and 1 GB, running api and worker roles | decided | M7 |
| Always-on cache | ElastiCache Serverless Valkey | decided | not planned |
| Development hosting (M0 to M6) | $0: the laptop with Docker Compose and Cloudflare Tunnel's free tier | decided | not planned |
| Always-on monthly cost (from M7) | about $56 to $61, mostly covered by new-account AWS credits ($100 plus up to $100 more) at first | arithmetic (the scaling record's breakdown) | the first month's bill |
| Always-on after M8 | one EC2 t4g.micro (1 GB) running the Compose stack, about $15 to $16 a month ([PRD section 17](README.md#a-cheaper-setup-for-a-few-people-after-m8)) | decided (a t4g.small, 2 GB, costs about $6 more; a type change takes about two minutes and moves nothing) | after M8: move to t4g.small if memory stays above 85%, swap is used steadily, or CPU credits run out |
| AWS trial run (end of M6) | a few hours of always-on, under $1 | arithmetic | not planned |
| Connection pool, api process | 10 | judgement (RDS allows about 100 connections on 1 GB) | M8 breaking point |
| Connection pool, worker process | 5 | judgement | M8 |
| Queues | 4 standard queues (`sync`, `ai`, `notify`, `maintenance`), each with a dead-letter queue | arithmetic (4 long-polled queues stay inside SQS's 1M free requests a month; 8 wouldn't) | M8 |
| Visibility timeout | 60 s; `ai` queue 120 s | judgement | M8 |
| Receives before the dead-letter queue | 5 | judgement | M8 |
| Dead-letter alarm | any message | decided | not planned |
| Outbox relay poll | every 1 second | judgement | M8: outbox lag during the webhook storm |
| Due-row tick (held pushes, cutoffs) | every 5 minutes | judgement | M8 |
| Nightly maintenance tick (expiry, per-day audit) | 03:00 UTC | judgement | not planned |
| Scheduler calls a month | about 55,000 (free up to 14M) | arithmetic | not planned |
| Point-in-time recovery | about 5 minutes of data at most | researched | not planned |
| Backups age out | within 35 days | decided | not planned |
| Account deletion job | within 24 hours | decided | not planned |
| AWS Budgets alerts | $75 and $150 a month | decided | see the note below |
| Load-test setup sweep | destroy anything older than 8 hours | decided | not planned |
| Load-test sizing (tasks, database class, k6 machines) | set by the first run | decided | M8 |

**Note on the budget alert.** Always-on alone is about $56 to $61, so a month with one load-test run (about $14) lands right around the $75 alert. That's acceptable as a reminder during M8. If it becomes noise, raise the first alert to $90.

## Load test

| Setting | Starting value | Basis | Replaced by |
|---|---|---|---|
| Synthetic accounts | 100k, each with a year of history | decided | not planned |
| With bank sync / with a wearable | 60% / 70% | judgement | M7: refined before the first run |
| Active per day | 40k, about 6 app opens each, a workout about every other day | judgement | M7 |
| Webhook storm | 60k webhooks in about 10 minutes | judgement | M7 |
| Everyday reads | p95 under 300 ms, p99 under 1 s | decided | not planned |
| Everyday writes | p95 under 500 ms | decided | not planned |
| Everyday errors | under 0.1% | decided | not planned |
| Sleep wave | 99% of checks within 15 minutes of sleep arriving | decided | not planned |
| Webhook storm catch-up | every bank login within 15 minutes, with exact match | decided | not planned |
| Chat overspend | under 1% per allowance | decided | not planned |
| CI smoke test | about 5 virtual users for about 1 minute; errors under 1%; all four verifiers pass; no latency gate | decided | not planned |

## Observability

| Setting | Starting value | Basis | Replaced by |
|---|---|---|---|
| Telemetry before M7 | structured console logs only, with no personal data | decided | not planned |
| Telemetry destination, from M7 | Grafana Cloud free tier | decided | the tier's limits, if a load-test run exceeds them |
| Phone crash and error reports (from M3) | Sentry free plan; request bodies, screenshots, session replay and personal breadcrumbs off | decided | not planned |
| Alert: errors | over 1% of requests for 5 minutes | judgement | M7 |
| Alert: queue backlog | over 1,000 messages for 10 minutes, or outbox lag over 60 seconds | judgement | M7 |
| Alert: dead-letter queue | any message | decided | not planned |
| Alert: health sync silent | no Health data for 24 hours | judgement | M7 |
| Alert: AI spend | chat or unprompted AI spend at 80% of its cap | judgement | M7 |
