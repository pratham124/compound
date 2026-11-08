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

## Using the tokens in Expo

- **Colours:** pick `colors.light` or `colors.dark` from `useColorScheme()`. Don't hard-code a hex anywhere else.
- **Rounded body text:** `fontFamily: 'ui-rounded'` is the iOS system rounded face. No font file is needed.
- **Fraunces:** load the variable font file with `expo-font` and set `fontVariationSettings: fonts.displayVariation` (`SOFT 100`, `WONK 0`) on every display Text. That needs React Native 0.88 or later. On an older version, make a static instance at SOFT 100 with `fonttools varLib.instancer` and load that instead.
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
- **Done sets** show a solid green check. The difference between done and not done must read at a glance between sets.

## Still to judge on the phone

- Where the chat button rests. At the right edge it covers trailing values, such as "$59 of $59" and the Units chevron.
- The press scale, the snap spring and the blink timing.
- Fraunces at small sizes on a real screen.
