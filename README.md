# Compound

One place for your workouts, health and spending, so your AI assistant can see all three and answer questions that need them together. For example: "Do I order more takeout after a bad night's sleep?" or "Is my gym membership worth it, given how often I actually went?"

Compound is still being planned, and nothing is built yet. To see what it will do and why, start with the [vision](docs/vision.md).

## How it will work

These diagrams show the plan for the first version. It's built to handle 100,000 people, and that will be tested with 100,000 simulated users. The diagrams will change as planning finishes.

**What it's built with:**
- **iPhone app:** made with Expo (React Native). It reads sleep, steps and heart data from Apple Health, and logs workouts even with no signal.
- **Server:** one TypeScript program, split into separate parts, running on Amazon Web Services (AWS).
- **Data:** stored in a Postgres database that keeps each person's data walled off from everyone else's, plus a fast in-memory store (Valkey) for sign-ins and usage limits.
- **Background work:** jobs like syncing bank transactions go through a queue (Amazon SQS) and are written down in the same step as the change that caused them, so none get lost. A scheduler (EventBridge) handles timed work.
- **AI assistants:** Claude or ChatGPT can connect through MCP, a standard way for assistants to use apps. You approve exactly what they can see and change.

### The big picture

Everything comes in through one front door: the app, your AI assistant, and Plaid (the service that connects bank accounts). The server runs as two kinds of worker. One answers requests right away. The other handles background jobs and talks to Plaid, the AI model, and Apple's notification service. For load tests, a bigger copy of the whole setup is created, run, and then torn down.

![The big picture](docs/architecture/deployment.svg)

### Inside the server

The server is split into seven parts: workouts, health, money, coaching, notifications, the AI assistant, and sign-in. Each part keeps its own data. Solid arrows mean one part asks another directly. Dashed arrows mean it leaves a job to be done later, through the queue.

![Inside the server](docs/architecture/modules.svg)

### When your bank has new transactions

Plaid tells Compound when there are new transactions. If it says so several times in a row, Compound still fetches them only once. Only one fetch per bank connection runs at a time, and everything is saved in a single step, so a retry never creates duplicates.

![New bank transactions](docs/architecture/plaid-webhook-flow.svg)

### From last night's sleep to a recovery note

When your phone has new sleep data, it sends it to Compound. Once no new sleep has arrived for 30 minutes, Compound treats last night's sleep as complete. A check that runs every 15 minutes then looks at your recovery, once for the day. If your sleep and training together suggest a lighter day, it writes a short recovery note and sends you a notification.

![Sleep to recovery note](docs/architecture/sleep-recovery-note-flow.svg)
