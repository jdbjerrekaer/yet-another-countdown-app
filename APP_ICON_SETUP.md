# iOS App Icon Setup Guide

## Current Status
Your iOS app icon is configured to use a single 1024×1024 image at:
`ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`

## Requirements for iOS App Icons

1. **Size**: Exactly 1024×1024 pixels
2. **Format**: PNG (no transparency needed, but allowed)
3. **Shape**: Perfect square (iOS will apply rounded corners automatically)
4. **Color Space**: sRGB
5. **No Pre-applied Rounded Corners**: iOS applies its own superellipse mask

## Important: Your Current Icon

The icon you've shown has **rounded corners already applied**. For best results on iOS:

- ✅ **Keep**: The design elements (clock ring, calendar, colors)
- ❌ **Remove**: The rounded corners (extend to square edges)
- ✅ **Ensure**: Perfect 1024×1024 square dimensions

## How to Prepare Your Icon

### Option 1: Using Image Editing Software

1. Open your icon in Photoshop, Figma, or similar
2. Remove the rounded corners by extending the background to square edges
3. Export as PNG, 1024×1024 pixels
4. Save as `AppIcon-512@2x.png`

### Option 2: Using macOS Built-in Tools (sips)

If you have a square version without rounded corners:

```bash
# Resize to exactly 1024x1024 (if needed)
sips -z 1024 1024 your-icon.png --out ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png

# Verify dimensions
sips -g pixelWidth -g pixelHeight ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
```

### Option 3: Using ImageMagick (if installed)

```bash
# Remove rounded corners by extending background (if you have a square source)
convert your-icon.png -resize 1024x1024^ -gravity center -extent 1024x1024 ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
```

## Quick Setup Script

Save your new icon as `new-app-icon.png` in the project root, then run:

```bash
# This will resize and copy your icon to the correct location
sips -z 1024 1024 new-app-icon.png --out ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
```

## Verification

After replacing the icon:

1. Open Xcode: `open ios/App/App.xcworkspace`
2. Navigate to `Assets.xcassets` → `AppIcon`
3. Verify the icon appears correctly
4. Build and run to see it on device/simulator

## Design Recommendations

Based on your icon design:
- ✅ The colorful gradient ring is perfect
- ✅ The orange clock hand is distinctive
- ✅ The calendar element adds context
- ⚠️ Make sure important elements aren't too close to edges (iOS mask will crop ~10% from corners)
- ⚠️ The neumorphic shadows should work well, but ensure good contrast

## Next Steps

1. Get a square version of your icon (without rounded corners)
2. Ensure it's 1024×1024 pixels
3. Replace the file at: `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
4. Rebuild your iOS app
