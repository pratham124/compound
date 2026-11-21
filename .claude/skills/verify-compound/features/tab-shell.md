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

## Driving it with Maestro (`flows/tab-shell.yaml`)

Preconditions:

- Launch is `READY`, Doctor passes, and `$EMAIL` is signed in on the Today tab.
- Run `bash .claude/skills/verify-compound/scripts/run-flow.sh tab-shell`.

Steps covered by `flows/tab-shell.yaml`:

- **Today.** Parks `Tools`, confirms `Today`, and captures `tab-shell-today` (greeting line, date line, server status card reporting running).
- **Each tab.** Taps `Train`, `Money`, `Trends`, `Chat` in turn, capturing `tab-shell-train`, `tab-shell-money`, `tab-shell-trends`, and `tab-shell-chat`, then taps `Today` to return.
- **Settings.** Taps `Settings`, confirms `Sign out`, captures `tab-shell-settings`, then presses back and confirms Today returns.
- **Signed out.** Reopens `Settings`, taps `Sign out`, confirms `Use an email code instead` appears with `Train` absent, and captures `tab-shell-signed-out`.

## Gotchas

- Check on the iPhone: the native tab bar itself. `expo-router/native-tabs` draws a UIKit tab bar on iOS with SF Symbols. On Android it is a Material bar, so its look, icons and layout under the content differ and prove nothing about iOS.
- Check on the iPhone: safe areas, the Dynamic Island, and the largest Dynamic Type size on every tab.
- Check on the iPhone: dark mode and the system tint, since the emulator's appearance follows the AVD setting.
- The greeting depends on the time of day and the person's name; assert that a greeting is present, not its wording.
- On the Android emulator the tab bar draws only the selected tab's label (Material's bottom bar with more than three tabs), but all five tabs are in the view tree with their titles as labels, so Maestro's `tapOn: "Train"` works. After a switch the title and the tab share the label, so judge the switch by the screenshot, not by a label assert alone. How the bar looks is an iPhone check.
- On the Android emulator the Settings button in the Today header overlaps the status bar, and the grey round button just below it is the development client's floating `Tools` button (`content-desc="Tools"`, also on the sign-in screen), not part of the app. This is Android-only rendering, not an app bug: the layout is fine on the iPhone, so don't report it as a failure. Check the header and the tabs on the iPhone.
