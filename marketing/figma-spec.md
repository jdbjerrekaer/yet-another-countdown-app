# Figma Spec — App Store Screenshots

Minimal-light aesthetic. Two artboards per screen (6.9" + 6.5"). Six screens. Twelve final PNGs.

## Artboards

| Label     | Size (px)     | Use for                              |
| --------- | ------------- | ------------------------------------ |
| `iPhone-6.9` | 1290 × 2796 | iPhone 16 Pro Max (Required)         |
| `iPhone-6.5` | 1284 × 2778 | iPhone 11 Pro Max (Required)         |

## Background

- Solid fill: `#FAFAF7` (warm off-white)
- No gradient. No noise. Stays out of the way.

## Device frame

- Use Apple's official iPhone 16 Pro Max bezel PNG from https://developer.apple.com/design/resources/ (section: Apple Design Resources → Product Bezels).
- Natural black titanium finish.
- Sized so the device's **inner screen** is **1050 px wide** on the 6.9" artboard (1044 px on the 6.5"). This leaves clean margins and a generous caption area.
- Horizontally centered.
- Top edge of the bezel aligned to **y = 1060** on the 6.9" artboard (1054 on the 6.5"). That puts the caption in the upper ~35% and gives the device room to breathe.
- Drop shadow: offset y +24, blur 48, color `#000000` at 8%.

## Caption

- **Font:** SF Pro Display Semibold. Fallback: Inter Semibold.
- **Size:** 96 pt
- **Color:** `#1A1A1A`
- **Tracking:** −1%
- **Line height:** 110%
- **Max:** 2 lines
- **Alignment:** center
- **Position:** top padding 180 px, left/right padding 100 px

Optional subcaption (only if the headline alone doesn't land):

- SF Pro Display Regular, 42 pt, `#6B6B6B`, tracking 0, 36 px below headline.

## Status bar

Screenshots taken with `xcrun simctl status_bar` override so:

- Time = **9:41**
- Battery = 100%
- Cellular = 5 bars
- Wi-Fi = 3 bars

No editing of the status bar required in Figma.

## Screens & captions (final gallery order)

| # | Source file                            | Caption                              |
| - | -------------------------------------- | ------------------------------------ |
| 1 | `raw/6.9/01-main-list.png`             | Don't let the days slip by           |
| 2 | `raw/6.9/02-homescreen-widgets.png`    | The best moments, always in sight    |
| 3 | `raw/6.9/03-widget-styles.png`         | Make every day feel closer           |
| 4 | `raw/6.9/04-calendar-import.png`       | Birthdays you'll never forget        |
| 5 | `raw/6.9/05-add-edit.png`              | Every moment, worth the wait         |
| 6 | `raw/6.9/06-lock-screen.png`           | A glance away, always                |

Same list, same captions, swap `/6.9/` for `/6.5/` on the second pass.

## Export

- Format: PNG, 1×
- Naming: `final/6.9/01-hero.png`, `final/6.9/02-widgets.png`, …
- No transparency. App Store rejects alpha on JPEG; PNG with solid background is fine.

## Validation

Before uploading to App Store Connect:

```bash
for f in marketing/final/6.9/*.png; do sips -g pixelWidth -g pixelHeight "$f"; done
for f in marketing/final/6.5/*.png; do sips -g pixelWidth -g pixelHeight "$f"; done
```

6.9" exports must report 1290 × 2796. 6.5" exports must report 1284 × 2778.

## Upload

https://appstoreconnect.apple.com → Yet Another Countdown → App Store tab → current version → scroll to **iPhone 6.9" Display** and **iPhone 6.5" Display** → drag the 6 files into each slot in order → **Save**.
