# Sourced by launch.sh, doctor.sh and cleanup.sh. Not run on its own.
REPO="$(git rev-parse --show-toplevel)"
WORKTREE_NAME="$(basename "$REPO")"
EVIDENCE_ROOT="${VERIFY_EVIDENCE_ROOT:-$HOME/compound-verify-evidence}"
POINTER="$EVIDENCE_ROOT/latest-$WORKTREE_NAME"

export ANDROID_HOME="${ANDROID_HOME:-$LOCALAPPDATA/Android/Sdk}"
ADB="$ANDROID_HOME/platform-tools/adb.exe"
EMULATOR="$ANDROID_HOME/emulator/emulator.exe"

AVD="${VERIFY_AVD:-Pixel_5_API_34}"
SERIAL="emulator-5554"
SERVER_PORT=3000
METRO_PORT=8082
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

app_installed() { "$ADB" -s "$SERIAL" shell pm list packages "$APP_ID" | tr -d '\r' | grep -qx "package:$APP_ID"; }
