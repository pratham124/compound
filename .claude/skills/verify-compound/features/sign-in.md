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

## Driving it with Maestro (`flows/sign-in.yaml`)

Preconditions:

- Launch with `bash .claude/skills/verify-compound/scripts/launch.sh --signed-out` (plain Launch signs in already) and confirm Doctor passes. The app is on the sign-in screen, signed out.
- Run `bash .claude/skills/verify-compound/scripts/run-flow.sh sign-in`. It runs `flows/sign-in.yaml` (reading the server-logged code for `$EMAIL` between the `request` and `verify` phases) and saves screenshots under `$EVIDENCE_DIR`.

Steps covered by `flows/sign-in.yaml`:

- **Open the email step.** Parks `Tools`, captures `sign-in-landing`, taps `Use an email code instead`, confirms `Email address` and `We'll email you a code. No password needed.` (the screen title is not in the accessibility tree, so Maestro cannot see it), and captures `sign-in-email-step`.
- **Bad email.** Types `not-an-email` into `Email address`, taps `Send code`, confirms `Enter a full email address, like name@example.com.`, and captures `sign-in-bad-email`.
- **Send a code.** Replaces the text with `$EMAIL`, taps `Send code`, confirms `We sent a code to $EMAIL.`, and `Sign-in code`, and captures `sign-in-code-step`. `run-flow.sh` reads the logged code from `$EVIDENCE_DIR/server.log`.
- **Wrong code.** Types `000000` (or `111111` if the real code is `000000`) into `Sign-in code`, taps `Sign in`, confirms `That code didn't work. Ask for a new one.`, and captures `sign-in-wrong-code`. Then taps `Use a different email` and requests a second code for `$EMAIL`, because clearing a refused code in place mangles the next one.
- **Right code.** Types the second logged code into the fresh `Sign-in code` field, taps `Sign in`, confirms `Today`, and captures `sign-in-today`.
- **Stays signed in.** Force-stops and relaunches the app (`stopApp` + `launchApp`), confirms `Today` returns without the sign-in screen, and captures `sign-in-reopened`.
- **Sign out.** Taps `Settings`, then `Sign out`, confirms `Use an email code instead` (`sign-in-signed-out`), relaunches the app, and confirms the sign-in screen persists (`sign-in-signed-out-reopened`).

Database check after the flow (`eval "$(bash .claude/skills/verify-compound/scripts/drive.sh env)"`):

```bash
docker compose exec -T postgres psql -U compound -d compound -c "select email, email_verified from users where email = '$EMAIL'" | tee "$EVIDENCE_DIR/sign-in-db.txt"
```

Confirm one row is returned for `$EMAIL`.

## Gotchas

- Check on the iPhone: the real Apple sign-in sheet, including the first-time name and `Hide My Email` choices, and the sign-in with Apple button's look. `expo-apple-authentication` doesn't run on Android, so `signin-apple` is never verified here.
- Check on the iPhone: that the session survives in the iOS Keychain across a restart. The emulator uses Android's secure storage, a different store.
- Check on the iPhone: the layout of the sign-in screen with safe areas and the largest Dynamic Type size.
- The code is only in the server log (console mailer, refused when `NODE_ENV=production`). If `grep` finds nothing, the mailer didn't run: look at `server.log` for the send error, don't invent a code.
- A code lasts five minutes and allows five attempts. Requests are rate limited per client address through Valkey. If the notice reads `Too many tries. Wait a minute, then try again.`, wait; don't change the limit.
- The profile row does not exist right after sign-in: `users` has the person, and `user_profiles` gets its row when Settings first opens (see `profile.md`). Query `users` for sign-in proof, as above.
- Use a new `$EMAIL` for each run. Reusing one signs in the existing person, so `signin-email-code` no longer proves a person is created.
