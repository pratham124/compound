#!/usr/bin/env bash
# Stops only what this run's launch.sh started, using the PIDs it recorded. Evidence stays in place.
set -uo pipefail

. "$(dirname "$0")/lib.sh"
load_state || exit 1

stop_pid() { # label, windows pid
  [ -n "${2:-}" ] || return 0
  taskkill //PID "$2" //T //F >/dev/null 2>&1 && echo "stopped $1 (pid $2)" || echo "$1 (pid $2) was already gone"
}

# Only if the PID still owns the port: a recycled PID is not ours to kill.
[ -n "${SERVER_PID:-}" ] && [ "$(listener_pid "$SERVER_PORT")" = "${SERVER_PID:-}" ] && stop_pid server "${SERVER_PID:-}"
[ -n "${METRO_PID:-}" ] && [ "$(listener_pid "$METRO_PORT")" = "${METRO_PID:-}" ] && stop_pid Metro "${METRO_PID:-}"

"$ADB" -s "$SERIAL" reverse --remove "tcp:$SERVER_PORT" >/dev/null 2>&1
"$ADB" -s "$SERIAL" reverse --remove "tcp:$METRO_PORT" >/dev/null 2>&1

if [ "${EMULATOR_STARTED:-0}" = 1 ]; then
  "$ADB" -s "$SERIAL" emu kill >/dev/null 2>&1 && echo "stopped emulator $SERIAL"
else
  "$ADB" -s "$SERIAL" shell am force-stop "$APP_ID" >/dev/null 2>&1 && echo "stopped the app; left the emulator running"
fi

if [ "${STACK_STARTED:-0}" = 1 ]; then
  (cd "$REPO" && pnpm stack:down)
else
  echo "left the shared stack running (it was up before this run)"
fi

rm -f "$POINTER"
echo "Evidence kept in $RUN_DIR"
