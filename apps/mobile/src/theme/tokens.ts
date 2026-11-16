/**
 * Compound design tokens: the "Friendly" look, picked on 7 November 2026 (issue #27).
 *
 * Source of truth for colours, type, spacing, radii and press feedback in the Expo app.
 * The mockups in docs/design/mockups/index.html were built from these values. If the two disagree,
 * this file wins, and the mockup should be updated to match.
 *
 * Plain TypeScript with no imports. Units are iOS points, which are React Native units.
 */

/** Colours for one appearance. Every text colour passes 4.5:1 on bg, card, accentSoft and charTint. */
export type Palette = {
  /** Screen background (grouped background). */
  bg: string;
  /** Cards, list groups, chat bubbles from the AI. */
  card: string;
  /** Primary text. */
  label: string;
  /** Secondary text: captions, units, "last time" numbers. */
  secondary: string;
  /** Hairlines between rows. */
  separator: string;
  /** Empty check rings, chart baselines, empty set dots. */
  separatorStrong: string;
  /** The one interactive colour: buttons, links, selected tab, charts, done checks. */
  accent: string;
  /** Text and icons on top of accent. */
  onAccent: string;
  /** Tinted surfaces: tiles, tags, budget alert, write card, selected tab pill, progress tracks. */
  accentSoft: string;
  /** Mochi body. Decorative, never text. */
  char: string;
  /** Mochi outline and the shade where it sits. */
  charEdge: string;
  /** Mochi cheeks. */
  blush: string;
  /** Mochi eyes and mouth. Dark in both modes because they sit on the pink body. */
  eyes: string;
  /** Recovery note card. A barely-there pink, so the note reads as warm, not alarming. */
  charTint: string;
  /** The tint of a list row's blob (`.blob.bc`): the mochi pink mixed into the card, 50% in light and 30% in dark. */
  charBlob: string;
  /** The fill that sweeps across a hold-to-delete row: `danger` at about 14% over `card`. */
  dangerTint: string;
  /** Small highlights: the "Best yet" sparkle, the Steps and Notifications icon chips. Never text. */
  warm: string;
  /** The sparkle itself, where warm is too pale to see. Decorative. */
  warmDeep: string;
  /** Destructive actions only (Delete account). Not used for money or health numbers. */
  danger: string;
  /** Floating rest timer pill. */
  restBg: string;
  /** Floating tab bar material: translucent card colour over a blur. */
  glass: string;
  /** Bright top edge of the glass. */
  glassEdge: string;
  /** Hairline around the glass. */
  glassLine: string;
};

/** Both appearances; screens pick one with `useAppearance()`. */
export type ColorSchemes = { light: Palette; dark: Palette };

export const colors: ColorSchemes = {
  light: {
    bg: '#EDF3F0',
    card: '#FFFFFF',
    label: '#1E2B27',
    secondary: '#566A62',
    separator: '#E1EAE6',
    separatorStrong: '#C5D3CD',
    accent: '#276F5D',
    onAccent: '#FFFFFF',
    accentSoft: '#DDF0E9',
    char: '#FAD4DC',
    charEdge: '#E09AAB',
    blush: '#EE8FA6',
    eyes: '#3A2A2E',
    charTint: '#FFF5F7',
    charBlob: '#FDEAEE',
    dangerTint: '#F4E5E3',
    warm: '#F5DD8C',
    warmDeep: '#C9A227',
    danger: '#B04534',
    restBg: '#FFFFFF',
    glass: 'rgba(255,255,255,0.62)',
    glassEdge: 'rgba(255,255,255,0.9)',
    glassLine: 'rgba(0,0,0,0.06)',
  },
  // "Cocoa": warm brown-grey, like a room lit by a lamp.
  dark: {
    bg: '#191614',
    card: '#24201D',
    label: '#F5EFEA',
    secondary: '#B3A89F',
    separator: '#332D29',
    separatorStrong: '#453D38',
    accent: '#8FD3BD',
    onAccent: '#10221C',
    accentSoft: '#24302B',
    char: '#F0BCC7',
    charEdge: '#C7808F',
    blush: '#E07D96',
    eyes: '#3A2A2E',
    charTint: '#2E2225',
    charBlob: '#614F50',
    dangerTint: '#41322D',
    warm: '#E6CB7A',
    warmDeep: '#E6CB7A',
    danger: '#F2A08F',
    restBg: '#2C2724',
    glass: 'rgba(36,32,29,0.62)',
    glassEdge: 'rgba(255,255,255,0.22)',
    glassLine: 'rgba(255,255,255,0.08)',
  },
};

/**
 * Font families.
 * - text: the iOS system rounded face (SF Pro Rounded). Nothing to load.
 * - display: Fraunces, a variable serif loaded with expo-font, drawn with its SOFT axis at 100
 *   so the letters have rounded corners. Used only for titles and big numbers.
 */
export const fonts = {
  text: 'ui-rounded',
  display: 'Fraunces',
  /**
   * Axes shared by every display-font Text. Each display style in `type` adds its own `opsz`
   * (optical size) on top, because React Native doesn't set optical size automatically once
   * `fontVariationSettings` is given, and small Fraunces needs its sturdier small-size shapes.
   */
  displayVariation: { SOFT: 100, WONK: 0 },
} as const;

type TextStyle = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
  letterSpacing?: number;
  /** Display styles only. Pass straight to Text's `fontVariationSettings` (React Native 0.88+). */
  fontVariationSettings?: { SOFT: number; WONK: number; opsz: number };
};

/** Display axes for one size: soft corners, and an optical size matched to the point size. */
const display = (size: number) => ({ ...fonts.displayVariation, opsz: size });

/**
 * Type scale, matching the iOS text styles at the default text size.
 * React Native scales these with Dynamic Type by default (`allowFontScaling`), so layouts must
 * wrap or stack at large sizes rather than clip. letterSpacing is in points: about -0.02em on large
 * titles and -0.01em on title2. Body sizes are left at 0, because the iOS rounded system font
 * applies its own size-specific tracking. Fraunces has no such tables, which is why it is only
 * used at 17pt and up.
 */
export const type: Record<
  | 'largeTitle'
  | 'title2'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subheadline'
  | 'footnote'
  | 'caption',
  TextStyle
> = {
  /** Screen titles: Today, Money, Trends, Settings. */
  largeTitle: { fontFamily: fonts.display, fontSize: 34, lineHeight: 41, fontWeight: '600', letterSpacing: -0.68, fontVariationSettings: display(34) },
  /** Big numbers on tiles: 5 h 48 min, 3,214, 58. */
  title2: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.22, fontVariationSettings: display(22) },
  /** Card titles and exercise names use the display font; row labels use the text font. */
  headline: { fontFamily: fonts.display, fontSize: 17, lineHeight: 22, fontWeight: '600', fontVariationSettings: display(17) },
  body: { fontFamily: fonts.text, fontSize: 17, lineHeight: 22, fontWeight: '400' },
  callout: { fontFamily: fonts.text, fontSize: 16, lineHeight: 21, fontWeight: '400' },
  subheadline: { fontFamily: fonts.text, fontSize: 15, lineHeight: 20, fontWeight: '400' },
  footnote: { fontFamily: fonts.text, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontFamily: fonts.text, fontSize: 12, lineHeight: 16, fontWeight: '400' },
};

/**
 * Large titles stay on one line and shrink to fit at the biggest Dynamic Type sizes, down to this share
 * of their size, instead of wrapping mid-word.
 */
export const titleFit = { minimumFontScale: 0.7 } as const;

/** Every number that lines up in a column (sets, money, timers) uses tabular figures. */
export const numberVariant = ['tabular-nums'] as const;

/** Spacing scale. Use these steps, not in-between values. */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const layout = {
  /** Side margin of every screen. 20 on phones 430pt or wider (Pro Max), 16 below. */
  screenMargin: 16,
  screenMarginWide: 20,
  wideFrom: 430,
  /** Inside cards and list groups. */
  cardPadding: 16,
  /** Between cards stacked on a screen. */
  cardGap: 12,
  /** Between tiles in a grid (Today's numbers). */
  tileGap: 10,
  /** Minimum touch target. Applies to every button, field, check and row. */
  minTouch: 44,
  /** The profile button beside Today's title, greeting and date; 44 looked lost next to the three lines. */
  profileButton: 52,
  /** Main buttons (Apply, Finish when large, Add exercise). */
  buttonHeight: 50,
  /** Number fields in the logger. */
  fieldHeight: 44,
  /** Floating tab bar: inset from the screen sides, its height, and its gap above the home indicator. */
  tabBarInset: 20,
  tabBarHeight: 62,
  tabBarBottom: 21,
  /** Floating pills (rest timer) sit this far above the bottom of the screen. */
  floatingAboveBottom: 93,
  /** Space between the rows of a list group (`.grp` in the mockup). */
  groupGap: 6,
  /** The profile avatar on Settings, and the gap between it and the name. */
  avatar: 56,
  profileGap: 14,
  /** An inline two-option control in a list row (weight units): its width, and the inset of its track. */
  segmentWidth: 128,
  segmentInset: 3,
  /** From this Dynamic Type scale up, a row's value drops under its label (`html.larger` in the mockup is 1.38). */
  largerTextFrom: 1.3,
} as const;

/** The soft blob behind a list row's icon, and the icon drawn in it (`.blob` in the mockup). */
export const blob = { width: 37.4, height: 34, icon: 18.7 } as const;

export const radius = {
  /** Cards and list groups. */
  card: 24,
  /** Tiles inside a card (Today's numbers). */
  tile: 18,
  /** A row inside a list group (`.lrow` in the mockup). */
  row: 18,
  /** Chat bubbles. The corner nearest the speaker drops to bubbleTail. */
  bubble: 22,
  bubbleTail: 6,
  /** Inline banners (budget alert). */
  alert: 20,
  /** Logger number fields. */
  field: 14,
  /** Buttons, tags, segmented controls, the rest timer and tab bar: fully rounded. */
  capsule: 999,
  /** Progress bars. */
  bar: 4,
} as const;

/**
 * Shadows. Most surfaces are flat. Only things that float over content get a shadow.
 * iOS uses shadowColor/Offset/Opacity/Radius; Android ignores these and uses elevation.
 */
export const shadow = {
  floating: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.14, shadowRadius: 12 },
  /** The selected side of an inline two-option control. */
  segment: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.14, shadowRadius: 3 },
  chatButton: { shadowColor: '#14141E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 5 },
} as const;

/**
 * The mockup's `.glass` edge and lift, plus a tight contact layer. `boxShadow` rather than the shadow props above,
 * because iOS scales those by the view's alpha and the glass fill is translucent.
 */
export function glassShadow(palette: Palette): string {
  return `inset 0 1px 0 ${palette.glassEdge}, 0 0 0 0.5px ${palette.glassLine}, 0 1px 3px rgba(0,0,0,0.10), 0 8px 24px rgba(0,0,0,0.18)`;
}

/**
 * Press feedback. Every pressable scales down slightly as soon as a finger lands on it.
 * The mockup used 160ms; 140ms keeps press feedback inside animate-expo's 100–150ms range.
 * Judge on a real phone and tune here.
 */
export const press = {
  scale: 0.97,
  /** Small icon buttons (44pt) use the strong end of the 0.95–0.98 range; 0.97 moves them about 1pt, too little to feel. */
  iconScale: 0.95,
  /** Ease-out on the way down. */
  durationMs: 140,
  /** cubic-bezier(0.23, 1, 0.32, 1): a strong ease-out. */
  easing: [0.23, 1, 0.32, 1] as const,
  /** With Reduce Motion on, a press dims instead of scaling. */
  reducedMotionOpacity: 0.6,
} as const;

/**
 * Brand: the soft cent-and-arm mark. Artwork lives in docs/brand/ (see its README).
 * The app icon is the mark as soft "clay" on a deep green field. These are the colours Expo's
 * app.json needs for the splash screen and the Android adaptive icon background.
 */
export const brand = {
  /** App icon field: a gentle top-to-bottom green. */
  iconField: ['#2A7461', '#246A58'] as const,
  /** The clay mark's fill, light to shade. */
  iconMark: ['#F8FBF9', '#D9E8E1'] as const,
  /** Launch screen: the app background, with the flat mark in the accent. */
  splash: {
    light: { background: '#EDF3F0', mark: '#276F5D' },
    dark: { background: '#191614', mark: '#8FD3BD' },
  },
  /** Sign in: the soft mint field behind the icon tile. */
  signInField: { light: '#DDF0E9', dark: '#191614' },
} as const;

/** The chat button (the mochi). Motion and drag feel are judged on the phone, not here. */
export const chatButton = {
  /** Drawn size of the mochi; the touch target around it is `touch`. */
  width: 54,
  height: 50,
  touch: 56,
  /** Gap from the screen edge it snaps to. */
  edgeGap: 8,
  /** Where it starts: right edge, just above the tab bar. */
  defaultEdge: 'right' as const,
  /** Snap after a drag. A spring on transform, with the finger's release velocity handed over. */
  snapSpring: { dampingRatio: 0.8, response: 0.35 },
  /** Idle blink every ~5.6 s. Off when Reduce Motion is on. */
  blinkEveryMs: 5600,
  /** How long one blink takes, closed and open again. */
  blinkDurationMs: 180,
  /** Fades out while the keyboard is up and back in after. Opacity only, so it stays under Reduce Motion. */
  fade: { durationMs: 150, easing: [0.23, 1, 0.32, 1] as const },
  /** First appearance after launch: fades in while growing from `fromScale`, both on one ease-out. Reduce Motion fades only. */
  entrance: { fromScale: 0.9, durationMs: 300, easing: [0.23, 1, 0.32, 1] as const },
  /** Coming back after the quick chat sheet closes: a shorter version of the entrance, since it happens tens of times a day. */
  popBack: { durationMs: 200 },
  /** The white highlight and starch dusting drawn on the mochi, in both appearances. */
  highlight: '#fff',
  accessibilityLabel: 'Ask Compound',
} as const;

/**
 * Motion on the sign-in flow. Eases use `press.easing`. Reduce Motion drops the movement and keeps the fades.
 * Starting values to judge on a release build, then tune here.
 */
export const motion = {
  /** The native splash screen fading out once fonts and the session have loaded. */
  splashFadeMs: 200,
  /** Screen swap between signed out and signed in: the native stack fade. */
  screenFadeMs: 250,
  /** A button's label and spinner swapping places. */
  busyMs: 150,
  /** An error notice fading in, and the content below it sliding to make room. */
  noticeMs: 150,
  /** The thumb of a two-option control sliding to the other side, with a strong ease-in-out (it moves on screen). */
  segmentSlideMs: 200,
  segmentSlideEasing: [0.77, 0, 0.175, 1] as const,
  /** Hold-to-delete: how long to hold, and how fast the fill snaps back on an early release (with the press easing). */
  holdToDeleteMs: 1500,
  holdReleaseMs: 200,
  /** The next step of a flow fading in, rising from `stepNudge` points below. */
  stepMs: 200,
  stepNudge: 4,
  /** The mochi hopping out from behind the tile each time the sign-in screen appears. */
  mochiHopMs: 720,
  /** The mochi squishing and wiggling when tapped. */
  mochiBoopMs: 480,
  /** One mochi blink per loop; the blink itself is 4% of it, about 160ms. */
  mochiBlinkLoopMs: 4000,
  /** Under Reduce Motion the mochi only fades in. */
  mochiFadeMs: 200,
} as const;
