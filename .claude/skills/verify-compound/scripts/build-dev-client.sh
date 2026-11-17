#!/usr/bin/env bash
# Builds the Compound development client from a short-path checkout of origin/main and installs it on the booted
# emulator. Run it once, and again whenever a native module is added or upgraded. See SKILL.md, "One-time setup".
set -euo pipefail

. "$(dirname "$0")/lib.sh"

CHECKOUT="C:/cb"
CMAKE_VERSION="3.31.6"
SDK="$(cygpath -m "$ANDROID_HOME")"

if [ ! -d "$ANDROID_HOME/cmake/$CMAKE_VERSION" ]; then
  echo "Android SDK CMake $CMAKE_VERSION is missing. Install it in Android Studio: SDK Manager, SDK Tools, Show Package Details." >&2
  echo "The 3.22.1 that ships by default has ninja 1.10.2, which fails on long paths." >&2
  exit 1
fi

"$ADB" -s "$SERIAL" get-state >/dev/null || { echo "Boot the emulator first ($AVD)." >&2; exit 1; }

git -C "$REPO" fetch origin
if [ -d "$CHECKOUT" ]; then
  git -C "$CHECKOUT" checkout --detach origin/main
else
  git -C "$REPO" worktree add --detach "$CHECKOUT" origin/main
fi

# Hoisted, not pnpm's default layout: the isolated layout's long folder names overflow the NDK's path limit.
cd "$CHECKOUT"
pnpm install --frozen-lockfile --prefer-offline --node-linker=hoisted

cd apps/mobile
export ANDROID_HOME ANDROID_SDK_ROOT="$ANDROID_HOME"

# Call expo directly: pnpm exec and pnpm --filter reinstall the isolated layout first and undo the hoisted install.
EXPO="node ../../node_modules/expo/bin/cli"

# Every time, not only the first: that is how app.json plugin and permission changes reach android/. --no-install keeps it from touching the hoisted node_modules.
$EXPO prebuild --platform android --no-install

printf 'sdk.dir=%s\ncmake.dir=%s/cmake/%s\n' "$SDK" "$SDK" "$CMAKE_VERSION" > android/local.properties

$EXPO run:android --no-bundler
