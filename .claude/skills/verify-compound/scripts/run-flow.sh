#!/usr/bin/env bash
# Runs Maestro feature flows against the active Launch, keeping logs and screenshots under $EVIDENCE_DIR.
# Usage: run-flow.sh [--deep] <feature>...
# Features run in order on the same Launch, returning to Today before each. One failing feature does not stop the rest;
# the exit code is non-zero if any failed. --deep also runs each feature's flows/<feature>-deep.yaml after its base flow.
set -euo pipefail

. "$(dirname "$0")/lib.sh"
load_state || exit 1

DEEP=0
UNIT_MODE=0
UNITS=()
for arg in "$@"; do
  case "$arg" in
    --deep) DEEP=1 ;;
    --unit) UNIT_MODE=1 ;;
    -*) echo "Unknown option $arg" >&2; exit 2 ;;
    *) UNITS+=("$arg") ;;
  esac
done

if [ "${#UNITS[@]}" = 0 ]; then
  echo "Usage: run-flow.sh [--deep] <feature>..." >&2
  exit 2
fi

for unit in "${UNITS[@]}"; do
  if [ ! -f "$FLOWS_DIR/$unit.yaml" ]; then
    echo "No Maestro flow found at $FLOWS_DIR/$unit.yaml" >&2
    exit 2
  fi
done

require_maestro || exit 1

if [ "$UNIT_MODE" = 0 ]; then
  ORDER=()
  for unit in "${UNITS[@]}"; do
    ORDER+=("$unit")
    if [ "$DEEP" = 1 ] && [[ "$unit" != *-deep ]] && [ -f "$FLOWS_DIR/$unit-deep.yaml" ]; then
      ORDER+=("$unit-deep")
    fi
  done

  SUMMARY=()
  failed=0
  for unit in "${ORDER[@]}"; do
    run_maestro "$FLOWS_DIR/_to-today.yaml" "$RUN_DIR/maestro-to-today" "$RUN_DIR/to-today-maestro.log" >/dev/null || true
    started=$SECONDS
    if bash "$0" --unit "$unit"; then
      SUMMARY+=("PASS $unit $((SECONDS - started))s")
    else
      first_took=$((SECONDS - started))
      if [ "${RUN_FLOW_RETRY:-1}" = 0 ]; then
        failed=1
        SUMMARY+=("FAIL $unit ${first_took}s")
      else
        echo "Retrying $unit once (RUN_FLOW_RETRY=0 turns this off)." >&2
        run_maestro "$FLOWS_DIR/_to-today.yaml" "$RUN_DIR/maestro-to-today" "$RUN_DIR/to-today-maestro.log" >/dev/null || true
        started=$SECONDS
        if RUN_SUFFIX=-retry bash "$0" --unit "$unit"; then
          SUMMARY+=("FLAKY $unit ${first_took}s then $((SECONDS - started))s")
        else
          failed=1
          SUMMARY+=("FAIL $unit ${first_took}s then $((SECONDS - started))s")
        fi
      fi
    fi
  done

  echo "== Summary (evidence in $RUN_DIR) =="
  printf '%s\n' "${SUMMARY[@]}"
  exit "$failed"
fi

FEATURE="${UNITS[0]}"
FLOW="$FLOWS_DIR/$FEATURE.yaml"

SUFFIX="${RUN_SUFFIX:-}"
LOG="$RUN_DIR/$FEATURE$SUFFIX-maestro.log"
OUT_ROOT="$RUN_DIR/maestro-$FEATURE$SUFFIX"
mkdir -p "$OUT_ROOT"
: > "$LOG"

network_disabled=0
reverse_removed=0
orig_font_scale=""

restore_device() {
  if [ "$reverse_removed" = 1 ]; then
    "$ADB" -s "$SERIAL" reverse "tcp:$SERVER_PORT" "tcp:$SERVER_PORT" >/dev/null 2>&1 || true
    reverse_removed=0
  fi
  if [ "$network_disabled" = 1 ]; then
    "$ADB" -s "$SERIAL" shell "svc wifi enable; svc data enable" >/dev/null 2>&1 || true
    network_disabled=0
  fi
  if [ -n "$orig_font_scale" ]; then
    "$ADB" -s "$SERIAL" shell settings put system font_scale "$orig_font_scale" >/dev/null 2>&1 || true
    orig_font_scale=""
  fi
}
trap restore_device EXIT

disable_network() {
  local drop_api="${1:-0}"
  if [ "$drop_api" = 1 ]; then
    "$ADB" -s "$SERIAL" reverse --remove "tcp:$SERVER_PORT" >/dev/null 2>&1 || true
    reverse_removed=1
  fi
  "$ADB" -s "$SERIAL" shell "svc wifi disable; svc data disable" >/dev/null
  network_disabled=1
}

enable_network() {
  if [ "$reverse_removed" = 1 ]; then
    "$ADB" -s "$SERIAL" reverse "tcp:$SERVER_PORT" "tcp:$SERVER_PORT" >/dev/null
    reverse_removed=0
  fi
  if [ "$network_disabled" = 1 ]; then
    "$ADB" -s "$SERIAL" shell "svc wifi enable; svc data enable" >/dev/null
    network_disabled=0
  fi
}

set_large_font() {
  local current
  current="$("$ADB" -s "$SERIAL" shell settings get system font_scale 2>/dev/null | tr -d '\r' | tr -d ' ')"
  # Fresh Android emulators return "null" until font_scale has been written once.
  if [ -z "$current" ] || [ "$current" = "null" ]; then
    orig_font_scale="1.0"
  else
    orig_font_scale="$current"
  fi
  "$ADB" -s "$SERIAL" shell settings put system font_scale 2.0 >/dev/null
}

restore_font() {
  if [ -n "$orig_font_scale" ]; then
    "$ADB" -s "$SERIAL" shell settings put system font_scale "$orig_font_scale" >/dev/null
    orig_font_scale=""
  fi
}

# Match apps/mobile/src/today/greeting.ts dateLineFor() in the emulator's timezone.
emulator_today_date() {
  local tz
  tz="$("$ADB" -s "$SERIAL" shell getprop persist.sys.timezone 2>/dev/null | tr -d '\r')"
  node -e '
    const tz = process.argv[1] || undefined;
    const opts = { weekday: "long", day: "numeric", month: "long", ...(tz ? { timeZone: tz } : {}) };
    const parts = new Intl.DateTimeFormat("en-GB", opts).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t)?.value ?? "";
    process.stdout.write(`${get("weekday")}, ${get("day")} ${get("month")}`);
  ' "$tz"
}

run_phase() { # phase_name, extra -e flags...
  local phase="$1"; shift
  local phase_out="$OUT_ROOT/$phase"
  mkdir -p "$phase_out"
  run_maestro "$FLOW" "$phase_out" "$LOG" -e "EMAIL=$EMAIL" -e "PHASE=$phase" "$@"
  collect_screenshots "$phase_out" "$RUN_DIR" "$SUFFIX"
}

case "$FEATURE" in
  workouts)
    TODAY_DATE="$(emulator_today_date)"
    run_phase online
    disable_network 1
    run_phase offline -e "TODAY_DATE=$TODAY_DATE"
    enable_network
    ;;
  workouts-fixtures)
    run_phase fixtures
    set_large_font
    run_phase fixtures-large-text
    restore_font
    ;;
  sign-in)
    run_phase request
    CODE="$(wait_for_code 15)"
    WRONG_CODE="000000"
    [ "$CODE" = "000000" ] && WRONG_CODE="111111"
    run_phase wrong-code -e "WRONG_CODE=$WRONG_CODE"
    CODE="$(wait_for_code 15 2)"
    run_phase verify -e "CODE=$CODE"
    ;;
  exercises)
    run_phase online
    disable_network 0
    run_phase offline
    enable_network
    run_phase fixtures
    set_large_font
    run_phase fixtures-large-text
    restore_font
    ;;
  workouts-deep)
    disable_network 1
    run_phase deep
    enable_network
    ;;
  exercises-deep)
    run_phase prime
    run_phase clear-mem-cache
    disable_network 1
    run_phase disk-offline
    enable_network
    run_phase retry-online
    ;;
  device-checks)
    run_phase online
    disable_network 0
    run_phase offline
    enable_network
    ;;
  *)
    run_maestro "$FLOW" "$OUT_ROOT" "$LOG" -e "EMAIL=$EMAIL"
    collect_screenshots "$OUT_ROOT" "$RUN_DIR" "$SUFFIX"
    ;;
esac

echo "FLOW PASSED: $FEATURE (evidence in $RUN_DIR)"
