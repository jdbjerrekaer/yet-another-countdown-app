# Marketing assets — App Store screenshots

## What's here

| File | Status |
| --- | --- |
| `raw/6.9/01-main-list.png` | ✅ Captured (hero) — 1320×2868, Release build, 6 seeded countdowns |
| `raw/6.9/00-empty-state.png` | Reference (Debug build) |
| `seed-countdowns.js` | Devtools snippet to populate the app via Safari Web Inspector |
| `figma-spec.md` | Figma composition rules — artboard sizes, background, device frame, captions |

## What's still needed

5 more screens + 6.5" variants + marketing polish. The simulator is still running with the app in the correct seeded state.

### Screens to capture next (you need to navigate and re-run the screenshot command)

Screenshot command (repeatable):
```bash
xcrun simctl io 979B6F20-9A70-4310-A3D9-B28D09691BDE screenshot \
  /Users/jonatanbjerrekaer/yet-another-countdown-app/marketing/raw/6.9/<NAME>.png
```

| # | Filename | How to reach the screen |
| - | --- | --- |
| 2 | `02-homescreen-widgets.png` | In sim: swipe up to home → long-press home → Add widget → find "Yet Another Countdown" → add small + medium + large → back out → capture |
| 3 | `03-widget-styles.png` | In app: tap the calendar-icon top-right (widget preview panel). Pick focus/visual/classic styles. |
| 4 | `04-calendar-import.png` | In app: tap calendar icon → "Import from Calendar" modal. (Empty state showed "Or import from Calendar" link; with data seeded the entry point is the calendar icon in the header.) |
| 5 | `05-add-edit.png` | In app: tap `+` FAB → add-event modal with date picker. |
| 6 | `06-lock-screen.png` | In sim: press hardware lock button (⌘L) → add widget to lock screen → capture. |

### Known issues in captured screenshots

- **AdMob test banner** at the bottom (~170px strip) on the Release build. The `iap_remove_ads_entitlement = true` flag IS set in NSUserDefaults but AdMob banner shows during the race-condition window before `PurchasesManager` resolves. In Figma, mask/crop this strip out — the device bezel usually crops this anyway. Fix for the real fix: make `hasRemoveAds` read synchronously from `localStorage` before AdMob init.
- **Time shows "9:41"** ✅ status bar override is on.

### 6.5" variant

No 6.5" simulator installed. Two options:
1. Install iPhone 11 Pro Max sim via Xcode → Settings → Components → iOS 17.x → download, then re-run capture with that UDID
2. Or skip — ASC currently accepts a single 6.9" set and auto-scales for smaller devices

### Marketing polish (Figma)

Follow `figma-spec.md`:
- Canvas 1290×2796 (ASC 6.9" slot) — downscale captured 1320×2868 by 2.28% or use "fit" placement
- Off-white background `#FAFAF7`
- iPhone 16 Pro Max device frame from Apple's design resources
- Captions in emotional voice, listed in `figma-spec.md`
- Export 12 PNGs to `marketing/final/6.9/` (and 6.5/ if making variants)

### Upload

App Store Connect → Yet Another Countdown → current version → Screenshots → drag into each device size slot → Save.
