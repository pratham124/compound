# Compound M0 spike (throwaway)

Proves Apple Health background delivery wakes a force-quit app and the woken app uploads what it read.

## Run the server
    cd spike/server && npm start      # listens on :8787, logs lines, appends uploads.jsonl

## Tunnel (so the phone can reach the laptop)
    cloudflared tunnel --url http://localhost:8787
Paste the printed https://...trycloudflare.com URL into the app's server URL box and save it.

## Build (embedded-bundle internal Release build, not a dev client)
    cd spike/app && npx eas-cli@latest build -p ios --profile device

A dev client loads JS from Metro and cannot be trusted to run JS on a background wake, so we use a Release build.

## Notes
- Native folders are generated (CNG): never commit `ios/`.
- Observers are registered natively on every launch; JS subscribes at module scope in `app/index.ts`.
- Each wake POSTs to `/upload`; failures go to an on-device outbox (cap 50) and retry on next launch/wake.
