# Chat button and quick chat

A small mochi button floats over the app. Tapping it opens the Ask Compound sheet, which shows which screen it was opened from and a `Close` button. The button can be dragged and snaps to a screen edge. It is hidden on the Chat tab, Settings, the sign-in screens, and while a workout is in progress, and fades while the keyboard is up.

## Sub-features

- `chat-button-shown` shows the button on Today, Train, Money and Trends.
- `chat-button-hidden` hides the button on the Chat tab, on Settings and on the sign-in screens.
- `chat-sheet-open` opens the sheet from the button and says which screen it came from.
- `chat-sheet-close` closes the sheet with `Close` and the button comes back.
- `chat-button-drag` moves the button and snaps it to an edge, remembered after a restart.

## How to get to it (user POV)

- Tap the floating button on any tab except Chat. Its accessibility label is `Ask Compound` (iPhone only; see Gotchas).
- Drag the button to move it.

## Driving it with Maestro (`flows/chat-button.yaml`)

Preconditions:

- Launch is `READY`, Doctor passes, and `$EMAIL` is signed in on the Today tab.
- Run `bash .claude/skills/verify-compound/scripts/run-flow.sh chat-button`.

Steps covered by `flows/chat-button.yaml` (screenshots only; inspect each one):

- **Shown.** Parks `Tools`, then captures the button on `Today` (`chat-button-today`), `Train` (`chat-button-train`), `Money` (`chat-button-money`) and `Trends` (`chat-button-trends`).
- **Hidden.** Taps `Chat` and captures the screen with no button (`chat-button-hidden-chat`). Returns to `Today`, opens `Settings` and captures it with no button (`chat-button-hidden-settings`), then presses back and captures `chat-button-back-on-today`.

Not covered on Android, so check on the iPhone: the `Ask Compound` accessibility label and VoiceOver reading and activating the button, tapping it to open the sheet with `About: <screen>` and closing it with `Close`, and dragging it to an edge and finding it there after a restart.

## Gotchas

- On Android, Maestro's hierarchy has ChatButton's `Animated.View` at its untransformed bounds `[0,0][154,154]` with `important-for-accessibility=false` and no label, because the button is placed with `translateX`/`translateY`. It cannot be selected by `Ask Compound` or tapped by label. A likely Android accessibility bug, for a later app ticket.
- Check on the iPhone: how the drag feels, meaning the finger tracking, the spring snap and the haptics. A dev build on an emulator runs extra debug code and can't tell you.
- Check on the iPhone: how the sheet looks and behaves as a native iOS sheet, including swiping it down to dismiss and the glass `Close` button. On Android the same route renders as a different kind of modal.
- Check on the iPhone: that the button sits clear of the tab bar and the home indicator, and that it fades when the keyboard comes up.
- The button fades in on first appearance and after the sheet closes. A screenshot taken in the first 300 ms can show it half drawn; wait before capturing.
- The button leaves the accessibility tree while it is faded (`accessibilityElementsHidden`), so a find failing right after the keyboard closes is a timing issue, not a missing button.
- The line `About: this screen` has no screen to come from yet, because the button is hidden everywhere that isn't a tab. Don't force it with a deep link and count it as a pass.
- The sheet has no chat content yet: only the header and the source line exist. Don't assert a message box.
