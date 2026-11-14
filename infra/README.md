# Infra

Terraform for the always-on and load-test setups on AWS (PRD section 12).
Filled from M6.

## Local stack

Docker Compose runs Postgres, Valkey, an SQS emulator (ElasticMQ) and a tick sender that
stands in for EventBridge Scheduler. CI starts the same stack before its tests.

```sh
cp .env.example .env              # git-ignored; placeholders work as they are
pnpm stack:up                     # starts everything and waits until healthy
pnpm --filter @compound/server dev
pnpm stack:down                   # stops and removes the containers (data volume stays)
```

The stack is shared by every worktree, on one set of ports. `pnpm stack:down` in any of them
stops it for all. The ticker's files are bind-mounted from whichever checkout last ran
`pnpm stack:up`; if that worktree is deleted, rerun `pnpm stack:up` from the main checkout.

The server tests need the stack running. For the phone on home Wi-Fi, copy
`apps/mobile/.env.example` to `apps/mobile/.env` and put the laptop's address in it, then
restart Metro so it picks the address up. Windows Firewall must allow inbound TCP 3000 on the
private network, and Windows may class the home Wi-Fi as Public, where Node is blocked: set the
network's profile type to Private, then, from an admin PowerShell:
`New-NetFirewallRule -DisplayName "Compound dev server" -Direction Inbound -Protocol TCP -LocalPort 3000 -Profile Private -Action Allow`.
