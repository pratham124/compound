#!/usr/bin/env bash
# Brings up everything a drive needs: local stack, migrated server, emulator, Metro and the app on it.
# Usage: launch.sh [--signed-out]. Signs the test person in via Maestro unless told not to. See SKILL.md, Launch.
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

require_maestro || exit 1

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
  if [ "$server_started" = 1 ]; then
    # The server only listens once its migrations finish, so a launch that fails soon after starting it waits for that.
    local spid=""
    for _ in $(seq "${SERVER_RECORD_WAIT:-30}"); do
      spid="$(listener_pid "$SERVER_PORT")"
      [ -n "$spid" ] && break
      sleep 1
    done
    remember SERVER_PID "$spid"
  fi
  if [ "$metro_started" = 1 ]; then
    local mpid
    mpid="$(listener_pid "$METRO_PORT")"
    remember METRO_PID "$mpid"
    remember METRO_STARTED 1
    [ -n "$mpid" ] && record_metro_owner "$mpid"
  fi
  echo "Launch failed (exit $status). Run scripts/cleanup.sh before launching again." >&2
}
trap on_exit EXIT

[ -f .env ] || cp .env.example .env

# Boot the emulator first in the background so it overlaps with stack, server and Metro startup.
emulator_started=0
# A listed emulator that is offline or not yet booted is either starting or shutting down: wait for it to settle
# instead of reusing it (adb reverse fails on it) or starting a second one on the same serial.
for _ in $(seq "${EMU_SETTLE_WAIT:-60}"); do
  listing="$(emulator_listing)"
  [ -z "$listing" ] && break
  [ "$listing" = device ] && booted && break
  sleep 1
done
if [ -n "$listing" ] && ! { [ "$listing" = device ] && booted; }; then
  echo "$SERIAL is listed as '$listing' but never became ready or went away. Close it, then launch again." >&2
  exit 1
fi

if [ -n "$listing" ]; then
  remember EMULATOR_STARTED 0
else
  emu_args=(-avd "$AVD" -no-snapshot-save -no-boot-anim -no-audio)
  if [ -d "$HOME/.android/avd/$AVD.avd/snapshots/default_boot" ]; then
    emu_args+=(-snapshot default_boot)
  fi
  nohup "$EMULATOR" "${emu_args[@]}" > "$RUN_DIR/emulator.log" 2>&1 &
  emulator_started=1
  remember EMULATOR_STARTED 1
fi

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

# Reuse a running Metro on :8082 only if it belongs to this worktree and API URL; never touch :8081. Checked before
# the server starts: the server isn't listening yet when this fails, so on_exit couldn't record its PID for cleanup.
existing_metro="$(listener_pid "$METRO_PORT")"
if [ -n "$existing_metro" ]; then
  if metro_ready && metro_owned_by_worktree "$existing_metro"; then
    remember METRO_STARTED 0
    remember METRO_PID "$existing_metro"
  else
    echo "Port $METRO_PORT is already taken by a process that is not this worktree's Metro. Not double-driving it." >&2
    exit 1
  fi
else
  # A shell variable beats apps/mobile/.env, which holds the phone's LAN address and stays untouched.
  export EXPO_PUBLIC_API_URL="$API_URL"
  nohup pnpm --filter @compound/mobile start --port "$METRO_PORT" > "$RUN_DIR/metro.log" 2>&1 &
  metro_started=1
fi

# The server migrates the database before it listens, so a passing /health means an empty database is ready.
nohup pnpm --filter @compound/server start > "$RUN_DIR/server.log" 2>&1 &
server_started=1

if [ "$metro_started" = 1 ]; then
  wait_for "Metro to answer" 120 metro_ready
  mpid="$(listener_pid "$METRO_PORT")"
  remember METRO_PID "$mpid"
  remember METRO_STARTED 1
  record_metro_owner "$mpid"
  # Pre-warm Metro's Android bundle in the background while the emulator finishes booting.
  (
    url="$(curl -sf -H 'expo-platform: android' "http://localhost:$METRO_PORT" \
      | node -e 'const d = JSON.parse(require("fs").readFileSync(0,"utf8")); console.log(d.launchAsset?.url ?? "")' 2>/dev/null)" || exit 0
    [ -n "$url" ] && curl -sf "$url" -o /dev/null 2>/dev/null || true
  ) &
fi

if [ "$emulator_started" = 1 ]; then
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

# Every run starts signed out with no local data from an earlier run. pm clear would also wipe the dev client's own
# preferences, bringing its welcome sheet and developer menu back each time, so remove only the session and databases.
reset_app_data

# Start the app's 50-100 s cold bundle load now, so it overlaps the server's startup; the Maestro boot flow then only
# waits for the first screen. The server is needed only once the sign-in screen sends a code.
"$ADB" -s "$SERIAL" shell am start -a android.intent.action.VIEW -d "compound://expo-development-client/?url=http%3A%2F%2Flocalhost%3A$METRO_PORT" "$APP_ID" >/dev/null

wait_for "server /health to report ok" 90 server_ready
remember SERVER_PID "$(listener_pid "$SERVER_PORT")"

LAUNCH_LOG="$RUN_DIR/launch-maestro.log"
: > "$LAUNCH_LOG"

if [ "$SIGN_IN" = 1 ]; then
  run_maestro "$FLOWS_DIR/_boot-ready.yaml" "$RUN_DIR/maestro-launch/boot" "$LAUNCH_LOG" -e "METRO_PORT=$METRO_PORT" -e "OPEN_LINK=0" -e "SIGN_IN=1" -e "EMAIL=$EMAIL" >/dev/null
  CODE="$(wait_for_code 15)"
  run_maestro "$FLOWS_DIR/_sign-in-verify.yaml" "$RUN_DIR/maestro-launch/sign-in-verify" "$LAUNCH_LOG" -e "CODE=$CODE" >/dev/null
  WHERE="signed in as the test person, on Today"
else
  run_maestro "$FLOWS_DIR/_boot-ready.yaml" "$RUN_DIR/maestro-launch/boot" "$LAUNCH_LOG" -e "METRO_PORT=$METRO_PORT" -e "OPEN_LINK=0" -e "SIGN_IN=0" >/dev/null
  WHERE="signed out, on the sign-in screen"
fi

echo "READY: stack, server (:$SERVER_PORT), emulator ($SERIAL) and app (Metro :$METRO_PORT) are up, $WHERE."
echo "EVIDENCE_DIR=$RUN_DIR"
echo "EMAIL=$EMAIL"
echo "Next: scripts/doctor.sh, then scripts/run-flow.sh <feature> (SKILL.md, Drive)."
