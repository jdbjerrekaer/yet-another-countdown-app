# Fixing iOS App Icon Cache Issue

The icon has been updated in the project, but iOS caches app icons. Follow these steps:

## Method 1: Clean Build in Xcode (Recommended)

1. **Open Xcode:**
   ```bash
   open ios/App/App.xcworkspace
   ```

2. **Clean Build Folder:**
   - Press `Cmd + Shift + K` (or Product → Clean Build Folder)
   - Wait for it to complete

3. **Delete Derived Data (if needed):**
   - Xcode → Settings → Locations
   - Click the arrow next to "Derived Data" path
   - Delete the folder for your project

4. **Rebuild:**
   - Press `Cmd + B` to build
   - Press `Cmd + R` to run

## Method 2: Delete App and Reinstall

1. **On your device/simulator:**
   - Long press the app icon
   - Tap "Remove App" → "Delete App"
   - This clears the icon cache

2. **Rebuild and install:**
   - In Xcode, press `Cmd + R` to rebuild and install

## Method 3: Reset Simulator (Simulator Only)

If using the iOS Simulator:

```bash
# Reset the simulator
xcrun simctl shutdown all
xcrun simctl erase all
```

Then rebuild and run the app.

## Method 4: Clear Icon Cache via Terminal

```bash
# Kill any running simulators
killall Simulator

# Clear derived data
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Rebuild
cd ios/App
xcodebuild clean -workspace App.xcworkspace -scheme App
```

## Verify Icon is Updated

After rebuilding:
1. Check Xcode's Assets.xcassets → AppIcon preview
2. The icon should show your new design
3. After installing, the home screen should show the new icon

## If Still Not Working

1. Verify the icon file:
   ```bash
   open ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
   ```
   This should show your new icon design.

2. Check Xcode:
   - Open `Assets.xcassets` → `AppIcon`
   - Verify the icon appears correctly in the preview

3. Try a different device/simulator to rule out device-specific caching
