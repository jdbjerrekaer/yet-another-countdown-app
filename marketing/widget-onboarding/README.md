# Widget-onboarding illustrations

The "how to add the widget" step illustrations. They are **live DOM**, not
images: `src/components/WidgetOnboardingFrames/`. The app renders them directly
in `WidgetOnboardingModal`, so they stay sharp at any size, follow the light/dark
theme, and the widget in the picture is the real `<SmallWidget />`.

This folder is only a preview/export harness for that component.

## Frames

| Name | Step | Shown on |
| --- | --- | --- |
| `01-long-press` | Touch and hold the Home Screen **background** until the apps jiggle | all |
| `02-tap-plus` | Tap **+** at the top of the screen | iOS 16–17 |
| `02-tap-edit` | Tap **Edit** at the top, then **Add Widget** | iOS 18+ |
| `03-search` | Search the widget gallery for the app | all |
| `04-add-widget` | Pick the size, tap add | all |
| `05-done` | Widget on the Home Screen (used as the intro hero) | all |

Frames carry no instruction text — the localized caption sits next to the
illustration in the modal, so one set of frames serves all 11 languages. The
only baked-in words are the app name and the sample countdown inside the widget,
plus iOS's own `Edit` / `Add Widget` / `Customise` labels in `02-tap-edit`.

## Step 2 differs by iOS version

Widgets need the widget extension's deployment target, **iOS 16**, so the
supported range is iOS 16, 17, 18 and 26. Per Apple's guide
([support.apple.com/en-gb/guide/iphone/iphb8f1bf206](https://support.apple.com/en-gb/guide/iphone/iphb8f1bf206/ios)):

- **iOS 16–17** — hold the background, then tap **+** in the top-left.
- **iOS 18 and 26** — hold the background, then **Edit** → **Add Widget**.

The modal picks the variant from the WKWebView user agent (`usesEditButton()`),
so no Capacitor plugin is needed.

iOS 26 also lets you long-press an app icon and pick a widget size, but the
background-hold path works on every supported version, so that's what we teach.

## Preview

```
npm run dev
open http://localhost:8080/marketing/widget-onboarding/?theme=dark
```

`?theme=light|dark` and `?lang=<code>` drive the render.

## Export to PNG (App Store material only — the app does not use these)

```bash
node marketing/widget-onboarding/capture.mjs --out-dir /tmp/widget-frames
node marketing/widget-onboarding/capture.mjs --langs en,da --scale 3
```

Starts and stops `npm run dev` itself. puppeteer is resolved from
`~/leadplatform/node_modules` rather than added as a devDependency here.
