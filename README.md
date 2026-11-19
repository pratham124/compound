# Compound

One place for your workouts, health and spending, so your AI assistant can see all three and answer questions that need them together. For example: "Do I order more takeout after a bad night's sleep?" or "Is my gym membership worth it, given how often I actually went?"

## What it does

- **Workouts:** browse and search exercises from Train, including offline, and open an exercise for instructions and pictures. The workout plans also cover logging sets, past workouts, personal bests, a rest timer and saved routines.
- **Health:** sleep, steps, resting heart rate and heart rate variability come in from Apple Health on their own and show on a Today card and a Trends screen, next to your training.
- **Money:** read-only bank sync through Plaid, spending sorted into categories, a monthly view, budgets with alerts, and a list and calendar of subscriptions, including what a gym costs per workout.
- **Recovery notes:** when your sleep and training suggest a lighter day, Compound writes a short note and sends it to you.
- **Chat and assistants:** ask questions in the app, or connect Claude or ChatGPT through MCP, a standard way for assistants to use apps. An assistant sees an area only after you turn its sharing switch on, and every change it makes is listed with an Undo.

Compound never moves money, never gives medical diagnosis or treatment advice, never gives personalized investment or regulated financial advice, and never sells your data or uses it for advertising.

## How it works

**What it's built with:**
- **iPhone app:** made with Expo (React Native). It reads sleep, steps and heart data from Apple Health, and logs workouts even with no signal.
- **Server:** one TypeScript program (Fastify), split into separate parts, running on Amazon Web Services (AWS).
- **Data:** stored in a Postgres database that keeps each person's data walled off from everyone else's, plus a fast in-memory store (Valkey) for sign-ins and usage limits.
- **Background work:** jobs like syncing bank transactions go through a queue (Amazon SQS) and are written down in the same step as the change that caused them, so none get lost. A scheduler (EventBridge) handles timed work.
- **AI assistants:** Claude or ChatGPT connect through MCP. You approve exactly what they can see and change.

### The big picture

Everything comes in through one front door: the app, your AI assistant, and Plaid (the service that connects bank accounts). The server runs as two kinds of worker. One answers requests right away. The other handles background jobs and talks to Plaid, the AI model, and Apple's notification service.

![The big picture](docs/architecture/deployment.svg)

[Open the interactive version](https://pratham124.github.io/compound/architecture/deployment.html): zoom, follow a route, and play the animation.

### Inside the server

The server is split into seven parts: workouts, health, money, coaching, notifications, the AI assistant, and sign-in. Each part keeps its own data. Solid arrows mean one part asks another directly. Dashed arrows mean it leaves a job to be done later, through the queue.

![Inside the server](docs/architecture/modules.svg)

[Open the interactive version](https://pratham124.github.io/compound/architecture/modules.html): zoom, follow a route, and play the animation.

### When your bank has new transactions

Plaid tells Compound when there are new transactions. If it says so several times in a row, Compound still fetches them only once. Only one fetch per bank connection runs at a time, and everything is saved in a single step, so a retry never creates duplicates.

![New bank transactions](docs/architecture/plaid-webhook-flow.svg)

[Open the interactive version](https://pratham124.github.io/compound/architecture/plaid-webhook-flow.html): zoom, follow a route, and play the animation.

### From last night's sleep to a recovery note

When your phone has new sleep data, it sends it to Compound. Once no new sleep has arrived for 30 minutes, Compound treats last night's sleep as complete. A check that runs every 15 minutes then looks at your recovery, once for the day. If your sleep and training together suggest a lighter day, it writes a short recovery note and sends you a notification.

![Sleep to recovery note](docs/architecture/sleep-recovery-note-flow.svg)

[Open the interactive version](https://pratham124.github.io/compound/architecture/sleep-recovery-note-flow.html): zoom, follow a route, and play the animation.

## Repo layout

| Path | What it holds |
|---|---|
| `apps/mobile/` | The Expo iPhone app |
| `apps/server/` | The Fastify server |
| `packages/contracts/` | Types and schemas shared by the app and the server |
| `infra/` | The local Docker stack, and Terraform for AWS |
| `loadtest/` | Whole-system test tooling, built in a later milestone |
| `docs/prd/` | The product spec and its appendices |
| `docs/architecture/` | The diagrams above, as SVG and interactive HTML |
| `docs/design/`, `docs/brand/` | Screen mockups, design tokens and brand assets |
| `scripts/`, `tools/` | Repo checks and the vendored lint plugins |

## Run it locally

You need Node 24 or newer, pnpm and Docker.

```sh
pnpm install
cp .env.example .env     # placeholders work as they are
pnpm stack:up            # Postgres, Valkey and an SQS emulator; waits until healthy
pnpm --filter @compound/server dev
```

The app is an Expo development build. On a Mac with Xcode, build it for a simulator or a plugged-in phone:

```sh
pnpm --filter @compound/mobile ios      # first build (expo run:ios)
pnpm --filter @compound/mobile start    # Metro, after that
```

Without a Mac, for example on Windows, build it in the cloud with EAS, using the `development` profile in `apps/mobile/eas.json`, and install it on your iPhone:

```sh
cd apps/mobile
eas build --platform ios --profile development
```

Then run Metro on the same Wi-Fi as the phone and open the app:

```sh
pnpm --filter @compound/mobile start
```

To reach the server from a phone on home Wi-Fi, copy `apps/mobile/.env.example` to `apps/mobile/.env` and set the laptop's address. [infra/README.md](infra/README.md) has the details, including the Windows firewall steps.

Checks:

```sh
pnpm lint
pnpm typecheck
pnpm test        # the server tests need the stack running
pnpm stack:down
```

## Docs

- [Product spec (PRD)](docs/prd/README.md)
- [Coding standards](CODING_STANDARDS.md)
- [Product notes for the app](apps/mobile/PRODUCT.md)
- [Brand](docs/brand/README.md)
- [Architecture diagram workflow](docs/agents/diagrams.md)
