#!/usr/bin/env bash
# Run-state helpers for flows and post-flow checks. The app itself is driven by Maestro (run-flow.sh). Subcommands:
#   env    print EVIDENCE_DIR, EMAIL and ADB for `eval "$(bash drive.sh env)"`
#   code   print the sign-in code the server logged for EMAIL
# DRIVE_WAIT is how many seconds `code` waits for the server to log it (default 8).
set -uo pipefail

. "$(dirname "$0")/lib.sh"
load_state || exit 1

WAIT="${DRIVE_WAIT:-8}"
LOG="$RUN_DIR/drive.log"

note() { echo "$(date +%H:%M:%S) $*" | tee -a "$LOG" >&2; }

case "${1:-}" in
  env)
    printf 'EVIDENCE_DIR=%q\nEMAIL=%q\nADB=%q\n' "$RUN_DIR" "$EMAIL" "$ADB"
    ;;
  code)
    # The console mailer prints the sign-in code to the server log, the only place it appears. It lands a moment after the tap.
    deadline=$((SECONDS + WAIT))
    while :; do
      code="$(grep "sign-in code for $EMAIL" "$RUN_DIR/server.log" | tail -1 | sed 's/.*: //')"
      [ -n "$code" ] && break
      [ "$SECONDS" -ge "$deadline" ] && { note "NO CODE for $EMAIL in server.log"; exit 1; }
      sleep 0.5
    done
    echo "$code"
    ;;
  *)
    sed -n "2,5p" "$0" >&2
    exit 2
    ;;
esac
