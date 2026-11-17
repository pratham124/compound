#!/usr/bin/env bash
# Drives the app on the emulator by label, through adb and uiautomator. Subcommands:
#   env                       print EVIDENCE_DIR, EMAIL and ADB for `eval "$(bash drive.sh env)"`
#   code                      print the sign-in code the server logged for EMAIL
#   sign-in                   sign EMAIL in through the email-code screens, ending on Today
#   find "<label>"            print the view bounds; exit 1 if it never appears
#   absent "<label>"          exit 0 once the view is gone; exit 1 if it is still there
#   tap "<label>"             tap the centre of the view
#   type "<label>" "<text>"   tap the field, then type
#   clear "<label>"           tap the field, then delete its text
#   drag "<label>" left|right swipe the view to that screen edge
#   key back|enter            press a system key
#   dev-menu                  dismiss the development client's welcome sheet and menu, then wait for the app's first screen
#   restart                   force-stop the app, open it again and wait (up to 60 s, DRIVE_RESTART_WAIT) for its first screen
#   screenshot <name>         save $EVIDENCE_DIR/<name>.png
#   dump <name>               save the view tree as $EVIDENCE_DIR/<name>.xml
# A label matches a view accessibilityLabel (content-desc) or its visible text, exactly. testID is not visible to adb.
# DRIVE_WAIT is how many seconds to wait for a view (default 8); screens animate, so views arrive late.
set -uo pipefail

. "$(dirname "$0")/lib.sh"
load_state || exit 1

WAIT="${DRIVE_WAIT:-8}"
LOG="$RUN_DIR/drive.log"

adb_() { "$ADB" -s "$SERIAL" "$@"; }

note() { echo "$(date +%H:%M:%S) $*" | tee -a "$LOG" >&2; }

# The view tree as XML. Some emulator images refuse /dev/tty, so fall back to a file on the device.
view_tree() {
  local xml
  xml="$(adb_ exec-out uiautomator dump /dev/tty 2>/dev/null | tr -d '\r')"
  if ! grep -q '<hierarchy' <<<"$xml"; then
    adb_ shell uiautomator dump /sdcard/compound-verify.xml >/dev/null 2>&1
    xml="$(adb_ exec-out cat /sdcard/compound-verify.xml 2>/dev/null | tr -d '\r')"
  fi
  printf '%s' "$xml"
}

# uiautomator escapes &, <, > and the delimiting quote in attribute values; whether it also writes an apostrophe as &apos; varies, so the matcher accepts either.
xml_escape() { sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' -e 's/"/\&quot;/g' <<<"$1"; }

# Prints the bounds, "x1 y1 x2 y2", of the first view whose content-desc or text is the label.
bounds_in() { # label, tree on stdin
  local want
  want="$(xml_escape "$1")"
  sed 's/<node/\n<node/g' | awk -v want="$want" '
    /^<node/ {
      t = ""; d = ""; b = ""
      if (match($0, / text="[^"]*"/)) t = substr($0, RSTART + 7, RLENGTH - 8)
      if (match($0, / content-desc="[^"]*"/)) d = substr($0, RSTART + 15, RLENGTH - 16)
      if (match($0, / bounds="\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]"/)) b = substr($0, RSTART + 9, RLENGTH - 10)
      gsub(/&apos;/, "\047", t); gsub(/&apos;/, "\047", d)
      if ((t == want || d == want) && b != "") {
        gsub(/[^0-9]+/, " ", b); sub(/^ /, "", b); split(b, a, " ")
        # The draggable chat button reports its width and height where the bottom-right corner belongs; a corner left of or above the origin gives it away.
        if (a[3] < a[1]) a[3] += a[1]
        if (a[4] < a[2]) a[4] += a[2]
        print a[1], a[2], a[3], a[4]; exit
      }
    }'
}

# Polls the tree until the label shows or the wait runs out.
await_bounds() { # label
  local deadline=$((SECONDS + WAIT)) found
  while :; do
    found="$(view_tree | bounds_in "$1")"
    [ -n "$found" ] && { echo "$found"; return 0; }
    [ "$SECONDS" -ge "$deadline" ] && return 1
    sleep 0.5
  done
}

centre_of() { # label -> "x y"
  local x1 y1 x2 y2
  read -r x1 y1 x2 y2 < <(await_bounds "$1") || { note "NOT FOUND: \"$1\" is not in the view tree"; return 1; }
  echo "$(((x1 + x2) / 2)) $(((y1 + y2) / 2))"
}

tap_label() {
  local x y
  read -r x y < <(centre_of "$1") || return 1
  adb_ shell input tap "$x" "$y"
  note "tap \"$1\" at $x,$y"
}

# The development client puts its first-run welcome sheet ("Continue"), and then its developer menu ("Reload" beside
# "Close"), over the app. Taps whichever one is showing, once, and returns 1 if neither is.
dismiss_dev_overlay() {
  local tree box x1 y1 x2 y2
  tree="$(view_tree)"
  box="$(bounds_in "Continue" <<<"$tree")"
  if [ -z "$box" ] && [ -n "$(bounds_in "Reload" <<<"$tree")" ]; then
    box="$(bounds_in "Close" <<<"$tree")"
  fi
  [ -n "$box" ] || return 1
  read -r x1 y1 x2 y2 <<<"$box"
  adb_ shell input tap "$(((x1 + x2) / 2))" "$(((y1 + y2) / 2))"
  note "dismissed a development client overlay at $(((x1 + x2) / 2)),$(((y1 + y2) / 2))"
}

# Waits for the app's own first screen (Today when signed in, the sign-in button when not), dismissing dev overlays.
await_app_screen() { # seconds
  local deadline=$((SECONDS + $1)) tree
  while :; do
    if ! dismiss_dev_overlay; then
      tree="$(view_tree)"
      [ -n "$(bounds_in "Today" <<<"$tree")$(bounds_in "Use an email code instead" <<<"$tree")" ] && return 0
    fi
    [ "$SECONDS" -ge "$deadline" ] && { note "TIMED OUT waiting for the app's first screen"; return 1; }
    sleep 1
  done
}

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
  sign-in)
    # The email-code path a person without Apple takes, ending on the Today tab.
    d() { bash "$0" "$@"; }
    d tap "Use an email code instead" && d find "Email address" >/dev/null &&
      d type "Email address" "$EMAIL" && d tap "Send code" && d find "Sign-in code" >/dev/null &&
      d type "Sign-in code" "$(d code)" && d tap "Sign in" && d find "Today" >/dev/null || exit 1
    note "signed in as $EMAIL"
    ;;
  dev-menu)
    await_app_screen "${DRIVE_RESTART_WAIT:-60}" || exit 1
    ;;
  restart)
    adb_ shell am force-stop "$APP_ID"
    adb_ shell monkey -p "$APP_ID" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
    await_app_screen "${DRIVE_RESTART_WAIT:-60}" || exit 1
    note "restart $APP_ID"
    ;;
  find)
    found="$(await_bounds "$2")" || { note "NOT FOUND: \"$2\""; exit 1; }
    echo "$found"
    ;;
  absent)
    deadline=$((SECONDS + WAIT))
    while [ -n "$(view_tree | bounds_in "$2")" ]; do
      [ "$SECONDS" -ge "$deadline" ] && { note "STILL PRESENT: \"$2\""; exit 1; }
      sleep 0.5
    done
    note "absent \"$2\""
    ;;
  tap)
    tap_label "$2" || exit 1
    ;;
  type)
    # adb input text takes letters, digits and a few symbols; spaces go in as %s. Anything else is refused, not mangled.
    case "$3" in
      *[!A-Za-z0-9@._,:/+=\ -]*) note "REFUSED: \"$3\" has characters adb input text can't type"; exit 1 ;;
    esac
    tap_label "$2" || exit 1
    sleep 0.3
    adb_ shell input text "${3// /%s}"
    note "type \"$3\" into \"$2\""
    ;;
  clear)
    tap_label "$2" || exit 1
    sleep 0.3
    adb_ shell input keyevent KEYCODE_MOVE_END
    # 67 is KEYCODE_DEL; 40 covers an email address.
    adb_ shell input keyevent $(printf '67 %.0s' $(seq 40))
    note "clear \"$2\""
    ;;
  drag)
    read -r x y < <(centre_of "$2") || exit 1
    width="$(adb_ shell wm size | tr -d '\r' | sed -n 's/.*: \([0-9]*\)x.*/\1/p' | tail -1)"
    case "$3" in
      left) to=40 ;;
      right) to=$((width - 40)) ;;
      *) echo "drag takes left or right" >&2; exit 2 ;;
    esac
    adb_ shell input swipe "$x" "$y" "$to" "$y" 600
    note "drag \"$2\" from $x,$y to $to,$y"
    ;;
  key)
    case "$2" in
      back) adb_ shell input keyevent KEYCODE_BACK ;;
      enter) adb_ shell input keyevent KEYCODE_ENTER ;;
      *) echo "key takes back or enter" >&2; exit 2 ;;
    esac
    note "key $2"
    ;;
  screenshot)
    adb_ exec-out screencap -p > "$RUN_DIR/$2.png"
    [ -s "$RUN_DIR/$2.png" ] || { note "EMPTY screenshot $2"; exit 1; }
    note "screenshot $RUN_DIR/$2.png"
    ;;
  dump)
    view_tree > "$RUN_DIR/$2.xml"
    grep -q '<hierarchy' "$RUN_DIR/$2.xml" || { note "EMPTY view tree for $2"; exit 1; }
    note "dump $RUN_DIR/$2.xml"
    ;;
  *)
    sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//' >&2
    exit 2
    ;;
esac
