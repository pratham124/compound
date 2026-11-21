#!/usr/bin/env bash
# Stops only what this run's launch.sh started, using the PIDs it recorded. Evidence stays in place.
# Pass --keep-metro to leave this worktree's Metro on :8082 running so the next launch.sh reuses it.
set -uo pipefail

. "$(dirname "$0")/lib.sh"
load_state || exit 1

KEEP_METRO=0
[ "${1:-}" = "--keep-metro" ] && KEEP_METRO=1

stop_pid() { # label, windows pid
  [ -n "${2:-}" ] || return 0
  taskkill //PID "$2" //T //F >/dev/null 2>&1 && echo "stopped $1 (pid $2)" || echo "$1 (pid $2) was already gone"
}

# Only if the PID still owns the port: a recycled PID is not ours to kill.
[ -n "${SERVER_PID:-}" ] && [ "$(listener_pid "$SERVER_PORT")" = "${SERVER_PID:-}" ] && stop_pid server "${SERVER_PID:-}"

# Legacy state files omit METRO_STARTED; default to 1 so they still stop METRO_PID.
if [ "$KEEP_METRO" = 1 ]; then
  echo "left Metro on :$METRO_PORT running (--keep-metro)"
elif [ "${METRO_STARTED:-1}" = 1 ]; then
  if [ -n "${METRO_PID:-}" ] && [ "$(listener_pid "$METRO_PORT")" = "${METRO_PID:-}" ]; then
    stop_pid Metro "${METRO_PID:-}"
    rm -f "$METRO_OWNER"
  fi
else
  echo "left Metro on :$METRO_PORT running (it was up before this run)"
fi

"$ADB" -s "$SERIAL" reverse --remove "tcp:$SERVER_PORT" >/dev/null 2>&1
"$ADB" -s "$SERIAL" reverse --remove "tcp:$METRO_PORT" >/dev/null 2>&1

if [ "${EMULATOR_STARTED:-0}" = 1 ]; then
  if "$ADB" -s "$SERIAL" emu kill >/dev/null 2>&1; then
    # emu kill returns while QEMU is still shutting down, and a launch in that window sees a listed emulator and skips booting.
    emulator_gone=0
    for _ in $(seq "${EMU_KILL_WAIT:-30}"); do
      [ -z "$(emulator_listing)" ] && { emulator_gone=1; break; }
      sleep 1
    done
    if [ "$emulator_gone" = 1 ]; then
      echo "stopped emulator $SERIAL"
    else
      echo "emulator $SERIAL is still listed after ${EMU_KILL_WAIT:-30}s; wait before launching again" >&2
    fi
  fi
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
