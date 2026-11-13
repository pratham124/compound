# Compound brand files

The mark is a cent sign whose top bar is a flexed arm. The app icon is the same mark drawn as soft clay.

## Files

| File | What it is | Where Expo uses it |
|---|---|---|
| `compound-mark.svg` | The soft mark, flat, in `#1E2B27` (label colour). For docs and small uses. | Not used by the app |
| `app-icon/icon.svg` / `.png` | Clay mark, mint-white on green. 1024, full bleed (iOS applies the corner mask). | `app.json` `icon`, and `ios.icon.light` |
| `app-icon/icon-dark.svg` / `.png` | Clay mark in `#8FD3BD` on Cocoa. iOS 18 dark appearance. | `ios.icon.dark` |
| `app-icon/icon-tinted.svg` / `.png` | Light-grey clay mark on an opaque black field (Expo requires icons with no transparent pixels). iOS 18 tinted appearance: iOS applies the user's tint to the greys. | `ios.icon.tinted` |
| `app-icon/splash-icon.svg` / `.png` | Flat soft mark in `#276F5D`, transparent, with generous padding. | `expo-splash-screen` plugin `image`, with `backgroundColor` `#EDF3F0` |
| `app-icon/splash-icon-dark.svg` / `.png` | Same, in `#8FD3BD`. | The plugin's `dark.image`, with `dark.backgroundColor` `#191614` |
| `app-icon/favicon.svg` / `.png` | Flat soft mark in `#EDF3F0` on a `#276F5D` rounded square (48). No clay filters at this size. | `web.favicon` |
| `app-icon/android-icon-background.svg` / `.png` | The green field gradient (512). | `android.adaptiveIcon.backgroundImage` |
| `app-icon/android-icon-foreground.svg` / `.png` | The clay mark only, transparent, inside the 66% safe zone (512). | `android.adaptiveIcon.foregroundImage` |
| `app-icon/android-icon-monochrome.svg` / `.png` | The flat soft mark in white, transparent, inside the safe zone (432). | `android.adaptiveIcon.monochromeImage` |
| `concepts/` | The earlier logo explorations. Not used by the app. | Not used by the app |

## Colours

These are the app's own tokens (`apps/mobile/src/theme/tokens.ts`).

- Green `#276F5D` (accent), mist `#EDF3F0` (light background), Cocoa `#191614` (dark background), mint `#8FD3BD` (dark accent), label `#1E2B27`.
- Icon field: a vertical gradient from `#2A7461` to `#246A58`. Dark icon field: `#1C1816` to `#161210`.
- Clay mark fill: `#F8FBF9` to `#D9E8E1` (light), `#B2E6D3` to `#78BFA6` (dark), `#EDEDED` to `#B4B4B4` (tinted).

## How the clay icon is made

The clay icon is the soft mark (the original geometry with a 2.6 round-join stroke in the fill colour, and round-ended bars) with three SVG filter effects: an inner highlight at the top left, an inner shade at the bottom right, and a blurred, offset drop shadow below. The filters sit in each SVG, so each file stands alone. Gradient and filter ids are unique per file.

The PNGs are rendered from the SVGs at exact pixel size with no scaling. The transparent ones keep their alpha.

## Expo wiring

`apps/mobile/app.json` points at the PNGs in `app-icon/` where they are, without copying them, as the table above shows. Renaming or moving one breaks the app build.

## iOS 26 and Icon Composer

From Expo SDK 54, Apple's preferred iOS icon is an Icon Composer `.icon` package (`ios.icon: "./assets/app.icon"`). It holds layered artwork that iOS renders with its Liquid Glass effect, and it produces the dark, tinted and clear looks itself. Icon Composer only runs on a Mac.

Until a Mac is available, the PNG set above works. Expo's rule for those PNGs is that they fill the whole square with no transparent pixels, which is why `icon-tinted.png` has a black field behind its grey mark. When moving to Icon Composer, rebuild the icon from flat layers: the green field, then the soft mark in one fill. Liquid Glass adds its own highlight and depth, so the clay filters should be dropped there.
