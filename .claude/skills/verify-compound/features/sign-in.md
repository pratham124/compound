# Sign-in

A person signs in with Apple, or with a six-digit code emailed to them, and lands on the Today tab. Signing out returns to the sign-in screen. The sign-in screen is the only screen a signed-out person can reach.

## Sub-features

- `signin-email-code` sends a code to an email address and signs in with it.
- `signin-bad-code` refuses a wrong code and stays on the code step.
- `signin-bad-email` refuses an address that isn't a full email.
- `signin-apple` signs in with Apple (iPhone only).
- `signin-sign-out` signs out from Settings and returns to the sign-in screen.
- `signin-session-kept` keeps the person signed in after the app restarts.

## How to get to it (user POV)

- Open the app while signed out: the sign-in screen shows the Apple button and `Use an email code instead`.
- Tap `Use an email code instead` for the email step, then `Send code` for the code step.
- Open Settings from the `Settings` button on the Today tab and tap `Sign out`.

## Driving it with drive.sh (adb on an Android emulator)

Preconditions:

- `D=.claude/skills/verify-compound/scripts/drive.sh` and `eval "$(bash $D env)"` are set in the Bash call. Each step below is `bash $D tap|type|find|absent "<label>"`, as `../SKILL.md` describes; a label that never appears is reported, not worked around.

- Launch with `bash .claude/skills/verify-compound/scripts/launch.sh --signed-out` (plain Launch signs in already) and Doctor passes. The app is on the sign-in screen, signed out.
- `$EMAIL` and `$EVIDENCE_DIR` come from `bash $D env`.

- **Open the email step.** Tap `Use an email code instead`, then `find "Email address"`. Take the screenshot after that `find`. The title reads `Sign in with an email code` and the `Email address` field has focus.
- **Bad email.** Type `not-an-email` into `Email address`, tap `Send code`. The notice `Enter a full email address, like name@example.com.` appears and the step doesn't change.
- **Send a code.** Replace the text with `$EMAIL`, tap `Send code`. The title becomes `Enter your code` and the text reads `We sent a code to $EMAIL.` `bash $D code` prints the code the server logged for `$EMAIL`.
- **Wrong code.** Type `000000` into `Sign-in code`, tap `Sign in`, then `find "That code didn't work. Ask for a new one."`. The notice `That code didn't work. Ask for a new one.` appears. One wrong try is fine; the limit is five. If the real code happens to be `000000`, use `111111`.
- **Right code.** Run `bash $D clear "Sign-in code"`, then `bash $D type "Sign-in code" "$(bash $D code)"`, tap `Sign in`, then `find "Today"`. The Today tab appears with its greeting. Capture the screenshot, then check the database: `select email, email_verified from users where email = '$EMAIL'` returns one row.
- **Stays signed in.** Run `bash $D restart`, and the Today tab appears without the sign-in screen.
- **Sign out.** Tap `Settings`, then `Sign out`. The sign-in screen appears. Reopening the app shows the sign-in screen again.

## Gotchas

- Check on the iPhone: the real Apple sign-in sheet, including the first-time name and `Hide My Email` choices, and the sign-in with Apple button's look. `expo-apple-authentication` doesn't run on Android, so `signin-apple` is never verified here.
- Check on the iPhone: that the session survives in the iOS Keychain across a restart. The emulator uses Android's secure storage, a different store.
- Check on the iPhone: the layout of the sign-in screen with safe areas and the largest Dynamic Type size.
- The code is only in the server log (console mailer, refused when `NODE_ENV=production`). If `grep` finds nothing, the mailer didn't run: look at `server.log` for the send error, don't invent a code.
- A code lasts five minutes and allows five attempts. Requests are rate limited per client address through Valkey. If the notice reads `Too many tries. Wait a minute, then try again.`, wait; don't change the limit.
- The profile row does not exist right after sign-in: `users` has the person, and `user_profiles` gets its row when Settings first opens (see `profile.md`). Query `users` for sign-in proof, as above.
- Use a new `$EMAIL` for each run. Reusing one signs in the existing person, so `signin-email-code` no longer proves a person is created.
