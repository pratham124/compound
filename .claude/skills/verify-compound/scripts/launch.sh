#!/usr/bin/env bash
# Brings up everything a drive needs: local stack, migrated server, emulator, and the app on it.
# Usage: launch.sh [--signed-out]. Signs the test person in unless told not to. Prints the evidence folder and email on the last lines. See SKILL.md, Launch.
set -euo pipefail

. "$(dirname "$0")/lib.sh"
cd "$REPO"

# An earlier run that was never cleaned up still owns processes, and its pointer is how cleanup.sh finds them.
if [ -f "$POINTER" ]; then
  echo "Run $(cat "$POINTER") was not cleaned up; run cleanup.sh first." >&2
  exit 1
fi

SIGN_IN=1
[ "${1:-}" = "--signed-out" ] && SIGN_IN=0

wait_for() { # description, seconds, command...
  local what="$1" seconds="$2"; shift 2
  for _ in $(seq "$seconds"); do
    "$@" >/dev/null 2>&1 && return 0
    sleep 1
  done
  echo "Timed out after ${seconds}s waiting for: $what" >&2
  return 1
}

server_ready() { curl -sf "$API_URL/health" | grep -q '"status":"ok"'; }
metro_ready() { curl -sf "http://localhost:$METRO_PORT/status" | grep -q 'packager-status:running'; }
booted() { [ "$("$ADB" -s "$SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; }
bundled() { grep -q 'Android Bundled' "$RUN_DIR/metro.log"; }

RUN_ID="$(date +%Y%m%d-%H%M%S)"
RUN_DIR="$EVIDENCE_ROOT/$RUN_ID"
EMAIL="verify-$RUN_ID@example.test"
mkdir -p "$RUN_DIR"
echo "$RUN_ID" > "$POINTER"
printf 'WORKTREE=%s\nRUN_ID=%s\nRUN_DIR=%s\nEMAIL=%s\n' "$REPO" "$RUN_ID" "$RUN_DIR" "$EMAIL" > "$RUN_DIR/state.env"

server_started=0
metro_started=0

# A launch that fails partway still leaves the PIDs it started in state.env, so cleanup.sh can stop them.
on_exit() {
  local status=$?
  [ "$status" = 0 ] && return
  [ "$server_started" = 1 ] && remember SERVER_PID "$(listener_pid "$SERVER_PORT")"
  [ "$metro_started" = 1 ] && remember METRO_PID "$(listener_pid "$METRO_PORT")"
  echo "Launch failed (exit $status). Run scripts/cleanup.sh before launching again." >&2
}
trap on_exit EXIT

[ -f .env ] || cp .env.example .env

# The stack is shared by every worktree: use it if it is up and leave it running.
if [ -z "$(docker compose ps --status running -q)" ]; then
  pnpm stack:up
  remember STACK_STARTED 1
else
  remember STACK_STARTED 0
fi

if [ -n "$(listener_pid "$SERVER_PORT")" ]; then
  echo "Port $SERVER_PORT is already taken by a process this run did not start. Not double-driving it." >&2
  exit 1
fi

# The server migrates the database before it listens, so a passing /health means an empty database is ready.
nohup pnpm --filter @compound/server start > "$RUN_DIR/server.log" 2>&1 &
server_started=1
wait_for "server /health to report ok" 90 server_ready
remember SERVER_PID "$(listener_pid "$SERVER_PORT")"

if "$ADB" devices | tr -d '\r' | grep -q "^$SERIAL	device"; then
  remember EMULATOR_STARTED 0
else
  nohup "$EMULATOR" -avd "$AVD" -no-snapshot-save -no-boot-anim -no-audio > "$RUN_DIR/emulator.log" 2>&1 &
  remember EMULATOR_STARTED 1
  wait_for "the emulator to boot" 240 booted
fi

"$ADB" -s "$SERIAL" reverse "tcp:$SERVER_PORT" "tcp:$SERVER_PORT"
"$ADB" -s "$SERIAL" reverse "tcp:$METRO_PORT" "tcp:$METRO_PORT"

# The development client is built once from a short path (SKILL.md, "One-time setup"): the NDK's CMake fails on
# the long paths a worktree's pnpm store produces, so a worktree can't build it.
if ! app_installed; then
  cat >&2 <<'RECIPE'
Compound's development build is not installed on the emulator, and a worktree can't build it (Windows path limit in the NDK).
With the emulator booted, build it once from a short-path checkout of main:
  bash .claude/skills/verify-compound/scripts/build-dev-client.sh
It needs Android SDK CMake 3.31.6 installed, checks out origin/main at C:/cb, installs with the hoisted node linker, and
runs `node ../../node_modules/expo/bin/cli run:android --no-bundler` (not pnpm exec) with android/local.properties set.
Then run launch.sh again. See SKILL.md, "One-time setup".
RECIPE
  exit 1
fi

if [ -n "$(listener_pid "$METRO_PORT")" ]; then
  echo "Port $METRO_PORT is already taken by a process this run did not start. Not double-driving it." >&2
  exit 1
fi

# A shell variable beats apps/mobile/.env, which holds the phone's LAN address and stays untouched.
export EXPO_PUBLIC_API_URL="$API_URL"

nohup pnpm --filter @compound/mobile start --port "$METRO_PORT" > "$RUN_DIR/metro.log" 2>&1 &
metro_started=1
wait_for "Metro to answer" 120 metro_ready

# Clearing the app's data drops a session left by an earlier run, so every run starts on the sign-in screen.
"$ADB" -s "$SERIAL" shell pm clear "$APP_ID" >/dev/null
"$ADB" -s "$SERIAL" shell am start -a android.intent.action.VIEW \
  -d "compound://expo-development-client/?url=http%3A%2F%2Flocalhost%3A$METRO_PORT" "$APP_ID" >/dev/null

wait_for "the app's JavaScript bundle to load" 300 bundled
remember METRO_PID "$(listener_pid "$METRO_PORT")"

# After the data clear the dev client shows its welcome sheet and then its developer menu over the app.
bash "$(dirname "$0")/drive.sh" dev-menu
DRIVE_WAIT=30 bash "$(dirname "$0")/drive.sh" find "Use an email code instead" >/dev/null

if [ "$SIGN_IN" = 1 ]; then
  bash "$(dirname "$0")/drive.sh" sign-in
  WHERE="signed in as the test person, on Today"
else
  WHERE="signed out, on the sign-in screen"
fi

echo "READY: stack, server (:$SERVER_PORT), emulator ($SERIAL) and app (Metro :$METRO_PORT) are up, $WHERE."
echo "EVIDENCE_DIR=$RUN_DIR"
echo "EMAIL=$EMAIL"
echo "Next: scripts/doctor.sh, then scripts/drive.sh (SKILL.md, Drive)."
