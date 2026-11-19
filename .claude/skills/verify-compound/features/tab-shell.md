# Five-tab shell

The app opens on a native tab bar with five tabs: Today, Train, Money, Trends and Chat. Today shows a greeting, the date and the server status card, with a `Settings` button. Train opens the [exercise catalogue](./exercises.md); Money, Trends and Chat show a title. Settings opens from Today and has its own screen.

## Sub-features

- `shell-tabs` switches between the five tabs and shows each tab's title.
- `shell-today` shows the greeting, the date line and the server status card on Today.
- `shell-settings` opens and closes Settings from Today.
- `shell-signed-out-gate` shows only the sign-in screen when signed out.

## How to get to it (user POV)

- Sign in. The Today tab is the first screen.
- Tap a tab label in the bar at the bottom: `Today`, `Train`, `Money`, `Trends`, `Chat`.
- Tap `Settings` at the top right of Today.

## Driving it with drive.sh (adb on an Android emulator)

Preconditions:

- `D=.claude/skills/verify-compound/scripts/drive.sh` and `eval "$(bash $D env)"` are set in the Bash call. Each step below is `bash $D tap|type|find|absent "<label>"`, as `../SKILL.md` describes; a label that never appears is reported, not worked around.

- Launch is `READY`, Doctor passes, and `$EMAIL` is signed in (see `sign-in.md`).

- **Today.** The title `Today` shows, with a greeting line, a date line, and a server status card. With the stack up the card reports the server as running. Capture a screenshot.
- **Each tab.** Tap `Train`, `Money`, `Trends`, `Chat` in turn. Each shows its own title as the heading, and the selected tab changes. Tap `Today` to return. Capture one screenshot per tab.
- **Settings.** Tap `Settings`. The `Settings` screen opens with the profile group and `Sign out`. Go back with `bash $D key back`. Today returns.
- **Signed out.** After `Sign out`, no tab bar shows: only the sign-in screen.

## Gotchas

- Check on the iPhone: the native tab bar itself. `expo-router/native-tabs` draws a UIKit tab bar on iOS with SF Symbols. On Android it is a Material bar, so its look, icons and layout under the content differ and prove nothing about iOS.
- Check on the iPhone: safe areas, the Dynamic Island, and the largest Dynamic Type size on every tab.
- Check on the iPhone: dark mode and the system tint, since the emulator's appearance follows the AVD setting.
- The greeting depends on the time of day and the person's name; assert that a greeting is present, not its wording.
- On the Android emulator the tab bar draws only the selected tab's label (Material's bottom bar with more than three tabs), but all five tabs are in the view tree with their titles as labels, so `drive.sh find "Train"` and `tap "Train"` work (checked: `tap "Money"` opened Money). After a switch the title and the tab share the label, so judge the switch by the screenshot and by a `dump`, not by `find` alone. How the bar looks is an iPhone check.
- On the Android emulator the Settings button in the Today header overlaps the status bar, and the grey round button just below it is the development client's floating `Tools` button (`content-desc="Tools"`, also on the sign-in screen), not part of the app. This is Android-only rendering, not an app bug: the layout is fine on the iPhone, so don't report it as a failure. Check the header and the tabs on the iPhone.
