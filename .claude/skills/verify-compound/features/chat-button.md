# Chat button and quick chat

A small mochi button floats over the app. Tapping it opens the Ask Compound sheet, which shows which screen it was opened from and a `Close` button. The button can be dragged and snaps to a screen edge. It is hidden on the Chat tab, Settings, the sign-in screens, and while a workout is in progress, and fades while the keyboard is up.

## Sub-features

- `chat-button-shown` shows the button on Today, Train, Money and Trends.
- `chat-button-hidden` hides the button on the Chat tab, on Settings and on the sign-in screens.
- `chat-sheet-open` opens the sheet from the button and says which screen it came from.
- `chat-sheet-close` closes the sheet with `Close` and the button comes back.
- `chat-button-drag` moves the button and snaps it to an edge, remembered after a restart.

## How to get to it (user POV)

- Tap the floating button on any tab except Chat. Its accessibility label is `Ask Compound`.
- Drag the button to move it.

## Driving it with drive.sh (adb on an Android emulator)

Preconditions:

- `D=.claude/skills/verify-compound/scripts/drive.sh` and `eval "$(bash $D env)"` are set in the Bash call. Each step below is `bash $D tap|type|find|absent "<label>"`, as `../SKILL.md` describes; a label that never appears is reported, not worked around.

- Launch is `READY`, Doctor passes, and `$EMAIL` is signed in on the Today tab.

- **Shown.** On Today `bash $D find "Ask Compound"` succeeds. `tap` `Train`, `Money`, `Trends` in turn (the tab labels are in the view tree even where the bar draws only one): the button is found on each.
- **Hidden.** `tap "Chat"`: `bash $D absent "Ask Compound"` succeeds. `tap "Today"`, then `tap "Settings"`: `absent` succeeds there too. After `Sign out`, the sign-in screen has no button.
- **Open the sheet.** `tap "Money"`, then `tap "Ask Compound"`. `find "About: Money"` succeeds, so the sheet is open. Repeat from Today and expect `About: Today`. Take the screenshot after that `find`.
- **Close.** Tap `Close`. The sheet goes and the button reappears on the same tab. Capture before and after.
- **Moves.** Run `bash $D drag "Ask Compound" left`. The button lands against the left edge. Run `bash $D restart`: it comes back on the left. Capture before and after.

## Gotchas

- Check on the iPhone: how the drag feels, meaning the finger tracking, the spring snap and the haptics. A dev build on an emulator runs extra debug code and can't tell you.
- Check on the iPhone: how the sheet looks and behaves as a native iOS sheet, including swiping it down to dismiss and the glass `Close` button. On Android the same route renders as a different kind of modal.
- Check on the iPhone: that the button sits clear of the tab bar and the home indicator, and that it fades when the keyboard comes up.
- The button fades in on first appearance and after the sheet closes. A screenshot taken in the first 300 ms can show it half drawn; wait before capturing.
- The button leaves the accessibility tree while it is faded (`accessibilityElementsHidden`), so a find failing right after the keyboard closes is a timing issue, not a missing button.
- The line `About: this screen` has no screen to come from yet, because the button is hidden everywhere that isn't a tab. Don't force it with a deep link and count it as a pass.
- The sheet has no chat content yet: only the header and the source line exist. Don't assert a message box.
