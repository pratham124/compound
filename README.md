# Compound

One place for your training, health and spending, which your AI assistant can read and reason across.

This project is in planning. Start with the [vision](docs/vision.md).

## Architecture

The planned architecture for the first version. It's designed for 100k users and will be tested with 100k synthetic users. These diagrams will change as planning finishes.

**Stack:**
- iPhone app: Expo (React Native) with Apple Health.
- Backend: a TypeScript monolith (Fastify), split into modules, on AWS Fargate.
- Data: Postgres with row-level security, and Valkey for sessions and rate limits.
- Background work: SQS with a transactional outbox, plus EventBridge Scheduler for timed jobs.
- Assistants connect through an MCP server with its own OAuth 2.1 server.

### Deployment

The app, your assistant and Plaid's webhooks come in through one load balancer. The same code runs in two roles. The api role answers requests, and the worker role sends outbox rows to SQS, runs jobs, and calls Plaid, the model provider and Apple's push service. A larger copy, built from the same Terraform, runs for each load test.

![Always-on deployment](docs/architecture/deployment.svg)

### Modules

Seven modules share one process. Solid arrows are calls through another module's public interface, never its tables. Dashed arrows are jobs: an outbox row written in the same transaction as the change, then delivered through SQS.

![Backend modules](docs/architecture/modules.svg)

### Flow: Plaid webhook to stored transactions

Repeat webhooks for the same bank login collapse into one sync. A lease keeps one sync per bank login at a time. Transactions, the cursor and daily spending totals commit together, so a retry never saves anything twice.

![Plaid webhook flow](docs/architecture/plaid-webhook-flow.svg)

### Flow: sleep upload to deload push

The phone uploads Apple Health samples when they arrive. Daily summaries are rebuilt in batches, off the request path. After a short wait for more data, one check per person per day decides whether to send a deload message.

![Sleep to deload flow](docs/architecture/sleep-deload-flow.svg)
