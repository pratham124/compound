# Sourced by launch.sh, doctor.sh, run-flow.sh, drive.sh and cleanup.sh. Not run on its own.
REPO="$(git rev-parse --show-toplevel)"
WORKTREE_NAME="$(basename "$REPO")"
EVIDENCE_ROOT="${VERIFY_EVIDENCE_ROOT:-$HOME/compound-verify-evidence}"
POINTER="$EVIDENCE_ROOT/latest-$WORKTREE_NAME"
FLOWS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/flows"

export ANDROID_HOME="${ANDROID_HOME:-$LOCALAPPDATA/Android/Sdk}"
# Maestro's JVM resolves adb from PATH; Android SDK platform-tools is not on Windows PATH by default.
export PATH="$ANDROID_HOME/platform-tools:$PATH"
ADB="$ANDROID_HOME/platform-tools/adb.exe"
EMULATOR="$ANDROID_HOME/emulator/emulator.exe"

export MAESTRO_CLI_NO_ANALYTICS=1
export MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true

AVD="${VERIFY_AVD:-Pixel_5_API_34}"
SERIAL="emulator-5554"
SERVER_PORT=3000
METRO_PORT=8082
METRO_OWNER="$EVIDENCE_ROOT/metro-$METRO_PORT.env"
APP_ID="com.pratham124.compound"
# The emulator reaches the laptop through adb reverse, so the app talks to localhost on its own side.
API_URL="http://localhost:$SERVER_PORT"

# The Windows PID of whatever is listening on a TCP port, or nothing.
listener_pid() {
  netstat -ano | tr -d '\r' | awk -v port=":$1" '$1 == "TCP" && $2 ~ port"$" && $4 == "LISTENING" { print $5; exit }'
}

state_file() { echo "$EVIDENCE_ROOT/$(cat "$POINTER")/state.env"; }

load_state() {
  [ -f "$POINTER" ] || { echo "No verify run recorded for $WORKTREE_NAME. Run launch.sh first." >&2; return 1; }
  # shellcheck disable=SC1090
  . "$(state_file)"
}

# Appends KEY=value to the run's state file.
remember() { echo "$1=$2" >> "$(state_file)"; }

# The serial's state in `adb devices` (device, offline, ...), or nothing when it is not listed.
emulator_listing() { "$ADB" devices 2>/dev/null | tr -d '\r' | awk -v s="$SERIAL" '$1 == s { print $2; exit }'; }

# Force-stops the app and deletes its session (SecureStore), SQLite databases, AsyncStorage and Expo Image disk cache (a
# warm cache turns the first-load checks into disk hits), leaving the dev client's
# own preferences (onboarding done, recent app) in place. Anything else in the app's data stays.
reset_app_data() {
  "$ADB" -s "$SERIAL" shell am force-stop "$APP_ID" >/dev/null
  "$ADB" -s "$SERIAL" shell run-as "$APP_ID" rm -rf shared_prefs/SecureStore.xml files/SQLite databases/RKStorage databases/RKStorage-journal databases/RKStorage-wal databases/RKStorage-shm cache/image_cache cache/image_manager_disk_cache >/dev/null
}

app_installed() { "$ADB" -s "$SERIAL" shell pm list packages "$APP_ID" | tr -d '\r' | grep -qx "package:$APP_ID"; }

find_maestro() {
  if [ -n "${MAESTRO:-}" ] && [ -f "$MAESTRO" ]; then echo "$MAESTRO"; return 0; fi
  if command -v maestro >/dev/null 2>&1; then command -v maestro; return 0; fi
  if command -v maestro.bat >/dev/null 2>&1; then command -v maestro.bat; return 0; fi
  if [ -x "/c/maestro/bin/maestro" ]; then echo "/c/maestro/bin/maestro"; return 0; fi
  if [ -f "/c/maestro/bin/maestro.bat" ]; then echo "/c/maestro/bin/maestro.bat"; return 0; fi
  if [ -x "$HOME/.maestro/bin/maestro" ]; then echo "$HOME/.maestro/bin/maestro"; return 0; fi
  return 1
}

require_maestro() {
  MAESTRO="$(find_maestro)" || {
    echo "Maestro CLI is not installed. Install Java 17+ and maestro.zip to C:\\maestro (SKILL.md, One-time setup)." >&2
    return 1
  }
}

# Windows Java rejects Git Bash /c/... paths; mixed C:/... paths work in both JVM and Git Bash.
maestro_path() {
  if command -v cygpath >/dev/null 2>&1; then cygpath -m "$1"; else echo "$1"; fi
}

maestro_driver_installed() {
  "$ADB" -s "$SERIAL" shell pm list packages dev.mobile.maestro 2>/dev/null | tr -d '\r' | grep -qx "package:dev.mobile.maestro"
}

run_maestro() { # flow_file, output_dir, log_file, extra maestro args...
  local flow="$1" out_dir="$2" log_file="$3"; shift 3
  local driver_flag=()
  if maestro_driver_installed; then
    driver_flag=(--no-reinstall-driver)
  fi
  mkdir -p "$out_dir"
  "$MAESTRO" test --no-ansi --device "$SERIAL" --test-output-dir "$(maestro_path "$out_dir")" \
    "${driver_flag[@]}" "$@" "$(maestro_path "$flow")" 2>&1 | tee -a "$log_file"
}

collect_screenshots() { # maestro_output_dir, evidence_dir, optional name suffix (a retry keeps the first attempt's files)
  local src="$1" dest="$2" suffix="${3:-}"
  [ -d "$src" ] || return 0
  # Exclude Maestro's automatic per-step debug captures (step-NNN-*.png) so only explicit takeScreenshot files land in $EVIDENCE_DIR.
  while IFS= read -r -d '' png; do
    cp -f "$png" "$dest/$(basename "$png" .png)$suffix.png"
  done < <(find "$src" -type f -name '*.png' ! -name 'step-*' -print0)
}

wait_for_code() { # seconds (default 15), how many codes must have been logged for EMAIL (default 1)
  local wait_secs="${1:-15}" want="${2:-1}" deadline code codes
  deadline=$((SECONDS + wait_secs))
  while :; do
    codes="$(grep "sign-in code for $EMAIL" "$RUN_DIR/server.log" 2>/dev/null)"
    if [ "$(grep -c . <<<"$codes")" -ge "$want" ]; then
      code="$(tail -1 <<<"$codes" | sed 's/.*: //')"
      [ -n "$code" ] && { echo "$code"; return 0; }
    fi
    [ "$SECONDS" -ge "$deadline" ] && { echo "NO CODE for $EMAIL in $RUN_DIR/server.log" >&2; return 1; }
    sleep 0.5
  done
}

# Only reuse a running Metro on :8082 if it belongs to this exact worktree and API URL.
metro_owned_by_worktree() { # pid
  local pid="$1"
  [ -f "$METRO_OWNER" ] || return 1
  local METRO_PID="" METRO_WORKTREE="" METRO_API_URL=""
  # shellcheck disable=SC1090
  . "$METRO_OWNER"
  [ "$METRO_PID" = "$pid" ] && [ "$METRO_WORKTREE" = "$REPO" ] && [ "$METRO_API_URL" = "$API_URL" ]
}

record_metro_owner() { # pid
  mkdir -p "$EVIDENCE_ROOT"
  printf 'METRO_PID=%s\nMETRO_WORKTREE=%s\nMETRO_API_URL=%s\n' "$1" "$REPO" "$API_URL" > "$METRO_OWNER"
}
