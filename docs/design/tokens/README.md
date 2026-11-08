# Compound design tokens

The look Pratham picked for Compound on 7 November 2026 ([#27](https://github.com/pratham124/compound/issues/27)): **Friendly**, with **Cocoa** dark mode and the mochi chat button.

- [`tokens.ts`](tokens.ts) holds the colours, type, spacing, radii, press feedback and chat button values. The Expo app copies or imports it once the monorepo exists.
- [`../mockups/index.html`](../mockups/index.html) shows every tab and Settings in light and dark, built from these values. Open it in a browser.
- [`../mockups/three-looks.html`](../mockups/three-looks.html) is the comparison the pick was made from (Calm, Soft, Friendly), kept as a record.

The mockups judge layout and style only. Motion and touch feel are judged later on a real iPhone, and the motion values in `tokens.ts` are starting points for that.

## The look in a few lines

- **Calm, with small warm touches.** Mint-mist background, white cards, one green accent. Training and money use the same colours. Spending is never shown red or green.
- **The mochi carries the cuteness.** It's the chat button, the AI's face in chat, the sleepy marker on recovery notes and in Trends. Everything else stays quiet.
- **Type:** titles and big numbers in Fraunces (a soft serif), everything else in the iOS rounded system font.
- **Dark mode is Cocoa:** warm brown-grey rather than black, so the pink and mint stay soft at night.

## The logo

The brand mark is a cent sign whose top bar is a flexed arm: money and training in one shape. It's drawn with soft, rounded ends. The **app icon** renders it as puffy mint clay on a deep green field, with iOS dark and tinted versions. The **launch screen** is the flat mark in the accent on the app background. **Sign in** shows the icon tile with the mochi peeking from its corner. The mark means "this is Compound", and the mochi means "ask me". Inside the app, the tabs carry no logo. Files and Expo wiring are in [`docs/brand/README.md`](../../brand/README.md), and the colours are `brand` in `tokens.ts`.

## Using the tokens in Expo

- **Colours:** pick `colors.light` or `colors.dark` from `useColorScheme()`. Don't hard-code a hex anywhere else.
- **Rounded body text:** `fontFamily: 'ui-rounded'` is the iOS system rounded face. No font file is needed.
- **Fraunces:** load the variable font file with `expo-font`. Then spread the display styles from `type` (`largeTitle`, `title2`, `headline`). Each one carries its own `fontVariationSettings`: SOFT 100, WONK 0, and an optical size (`opsz`) equal to its point size. React Native doesn't set optical size automatically, and without it a 17pt title gets the thin, high-contrast shapes meant for big display text. That needs React Native 0.88 or later. On an older version, make static instances (SOFT 100, one per optical size) with `fonttools varLib.instancer` and load those instead.
- **Numbers:** set `fontVariant: ['tabular-nums']` wherever numbers line up in columns (sets, money, timers).
- **Dynamic Type:** leave `allowFontScaling` on. At the largest sizes, tiles stack to one column, trailing values in lists wrap under their labels, and the logger moves "Last time" under each set instead of hiding it.
- **Tab bar:** use the native tab bar so labels get the Large Content Viewer at accessibility sizes. iOS doesn't grow tab labels itself.
- **Screen margins:** 16, or 20 on phones 430pt or wider.
- **Press feedback:** build one shared pressable that scales to `press.scale` on press-in. See `animate-expo` for the recipe.
- **Chat button:** drag with Gesture Handler. Snap with a Reanimated spring on `transform`, handing over the release velocity, not by animating `left`/`top`. Store the position as an edge plus a fraction of the screen height (PRD section 4).

## Decisions made along the way

- **Start workout was removed from Today.** Workouts start from Train only. PRD section 4 is updated to match.
- **Top-level Settings is a short list.** The AI sharing wording from `docs/prd/wording.md` lives on Settings → AI and assistants, word for word.
- **Pinned bars:** the workout bar in the logger and the Chat nav stay pinned, and content fades under them. There's no hard divider line.
- **Three tiers on task screens.**
  - Tier 1: one answer per screen, the only big type.
  - Tier 2: the main body in a card.
  - Tier 3: plain iOS grouped lists with small headers, so Fraunces marks only what matters.
  
  On Money, the answer is a sentence ("$1,284 spent so far, $126 less than by this point in October."). On Train, it's the next routine with one filled Start button.
- **Lists use soft glyphs.** Each list row leads with a small faceless mochi-silhouette blob, tinted by kind (warm for groceries and food, pink for coffee and Apple Health, mint for the rest), with a drawn icon inside. There are no hairlines inside a group, just spacing on one surface. Numbers on the right are Fraunces with tabular numerals. Details are separate words or lines, never joined with "·". Key/value detail rows and form rows (switches, steppers, pickers) stay plain iOS.
- **Budgets are jars.** Each budget is a small soft jar, in a two-column grid, filled with what's LEFT, so it empties as you spend. A tick on the jar's side marks where the level would be today at an even pace. Beside it sits "$40 left" (Fraunces) over "of $200". The 80% or 100% note sits under that budget's tile. A fixed charge that fills its budget shows a full jar with a lid and "Paid". The jars are the one place outside the mochi where the Friendly softness shows in a data component.
- **Next routine follows your rotation.** It's the routine after the last one you finished, in the order you set with Edit on Train (PRD section 5).
- **This week on Train** is a Monday-to-Sunday row of dots: green for lifting, pink for Apple Health workouts, a ring for today.
- **Recovery note on Today** has a fixed headline ("Maybe take it easier today"), then the message, then the evidence as drawn marks: last 3 nights' sleep against usual as two bars, and days in a row as dots that match Train's week strip. There's no label above it, and it stays short enough that "Last night and today" shows in the first screen.
- **Numbers are nudged with a scrubber.** Sets and reps show the value large in Fraunces, with its neighbours fading out on each side ("8 9 **10** 11 12"), on a soft track with a centre notch. Swipe it, or tap a neighbour. It's announced as an adjustable value ("10 reps"). There are no bare − and + steppers anywhere.
- **Routines are splits made of days.** Train leads with the current routine's next day ("Lower B is next, Upper/lower, day 4 of 4"), then that routine's days, then other routines.
- **Set up budgets picks jars.** Tap a jar to include it, tap its amount to scrub it, then one confirm button sets them all.
- **Days start with a round play button.** Each day in a routine has a small round start button, and the next day's is filled.
- **Rest timer** is a soft hourglass, with the time left as accent sand in the top bulb, beside "Rest", "1:24" in Fraunces and "of 2:00". Two quiet accent text buttons, "+15 s" over "−15 s", sit beside a filled Skip capsule.
- **One month-calendar component** serves Subscriptions, Transactions and Workouts: a Monday-first grid, a ring around today, a selected day in accent-soft, prev/next month arrows (next disabled on the current month), and the selected day's items listed under the grid. Transactions show each day's spend in the cell. Workouts show a dot: green for logged, pink for Apple Health.
- **No List/Calendar switches.** Subscriptions, Transactions and Workouts are calendar-only pages. Under the grid sits the selected day's items, or on Subscriptions every active subscription, so annual ones that don't renew this month still show. The Subscriptions calendar uses a filled dot for a charge that's happened and an outline dot for an expected renewal.
- **Chat confirms changes with reply buttons.** Chat proposes the change in its own message, and two buttons sit under it: the confirm (filled accent, label built by the server, such as `Save "Easy legs"`) and Not now (tinted). There's no separate card. PRD section 10 and `docs/prd/wording.md` are updated to match.
- **No kilograms of volume anywhere.** The logger summary is just "4 of 11 sets done", recent workouts show time (and watch calories when there are any), and Trends shows training as bars whose height is relative volume, with no number. Personal records still show weight, because there it is the record itself.
- **Trends is "sleep against training".** One chart: sleep as the line with a dashed "Usual" line, and training days as soft bars beneath it, labelled directly with no second axis. Resting heart rate, HRV and eating out follow as compact rows ("58 bpm, usual 55"), each opening its own full chart.
- **Weight units are a kg/lb switch right in Settings**, not a row that opens another page. With only two choices, one tap is enough.
- **Done sets** show a solid green check. The difference between done and not done must read at a glance between sets.

## Still to judge on the phone

- Where the chat button rests. At the right edge it covers trailing values, such as "$59 of $59" and the Units chevron.
- The press scale, the snap spring and the blink timing.
- Fraunces at small sizes on a real screen.
