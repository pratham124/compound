#!/usr/bin/env bash
# Read-only: is the instance this worktree's launch.sh started still worth driving? Exit 0 only if every check passes.
set -uo pipefail

. "$(dirname "$0")/lib.sh"
load_state || exit 1

failed=0
check() { # description, command...
  local what="$1"; shift
  if "$@" >/dev/null 2>&1; then echo "ok    $what"; else echo "FAIL  $what"; failed=1; fi
}

same_worktree() { [ "$WORKTREE" = "$REPO" ]; }
stack_up() { [ -n "$(cd "$REPO" && docker compose ps --status running -q)" ]; }
server_ours() { [ -n "${SERVER_PID:-}" ] && [ "$(listener_pid "$SERVER_PORT")" = "$SERVER_PID" ]; }
server_ok() { curl -sf "$API_URL/health" | grep -q '"status":"ok"'; }
metro_ours() { [ -n "${METRO_PID:-}" ] && [ "$(listener_pid "$METRO_PORT")" = "$METRO_PID" ]; }
metro_ok() { curl -sf "http://localhost:$METRO_PORT/status" | grep -q 'packager-status:running'; }
emulator_up() { "$ADB" devices | tr -d '\r' | grep -q "^$SERIAL	device"; }
reversed() { "$ADB" -s "$SERIAL" reverse --list | tr -d '\r' | grep -q "tcp:$SERVER_PORT" ; }
app_foreground() { "$ADB" -s "$SERIAL" shell dumpsys window | tr -d '\r' | grep -E 'mCurrentFocus' | grep -q "$APP_ID"; }

echo "run $RUN_ID, evidence in $RUN_DIR"
check "this run belongs to this worktree ($REPO)" same_worktree
check "local stack is running" stack_up
check "server on :$SERVER_PORT is the process this run started" server_ours
check "server /health reports ok (Postgres, Valkey, queue up, migrations applied)" server_ok
check "Metro on :$METRO_PORT is the process this run started" metro_ours
check "Metro reports running" metro_ok
check "emulator $SERIAL is online" emulator_up
check "adb reverse maps the server port" reversed
check "Compound is installed on the emulator" app_installed
check "Compound is the focused app" app_foreground

[ "$failed" = 0 ] && echo "DOCTOR: healthy, worth driving." || echo "DOCTOR: not healthy. Run cleanup.sh, then launch.sh again."
exit "$failed"
