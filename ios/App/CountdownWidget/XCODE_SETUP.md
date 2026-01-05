# CountdownWidget Xcode Setup

This folder contains the Swift source files for the iOS Home Screen widget. Follow these steps to add the widget extension to your Xcode project.

## Prerequisites

1. Open the project in Xcode: `npx cap open ios`
2. Ensure you have a valid Apple Developer account configured

## Step 1: Use Existing CountdownWidget Target

The `CountdownWidget` target already exists in your Xcode project. Skip creating a new target and proceed to add the files.

**If you see an error saying the target already exists:**
- Click **OK** to dismiss the error
- The target already exists, so you can proceed directly to Step 2

## Step 2: Add Files to Existing Target

The target already exists, so you need to add the Swift files to it. If there are any auto-generated template files, you can replace them with the files from this folder.

1. **Check existing files in the CountdownWidget group:**
   - In Xcode Navigator, expand the `CountdownWidget` group
   - If there are template files (like `CountdownWidget.swift`, `AppIntent.swift`), you can delete them or replace them

2. **Add the new Swift files:**
   - Right-click on the `CountdownWidget` group in the Navigator
   - Select **Add Files to "App"...**
   - Navigate to `ios/App/CountdownWidget/`
   - Select all `.swift` files from these folders:
     - `CountdownWidget.swift` (root)
     - All files in `Shared/` folder
     - All files in `Views/` folder
   - Also add the `Assets.xcassets` folder
   - **Important:** Ensure "Copy items if needed" is **unchecked** (we want to reference, not copy)
   - **Critical:** In the "Add to targets" section, check **CountdownWidget** (and uncheck App if it's checked)
   - Click **Add**

3. **Verify file membership:**
   - Select each Swift file in the Navigator
   - In the File Inspector (right panel), check that **CountdownWidget** target is checked
   - If any files show the App target checked, uncheck it (widget files should only be in CountdownWidget target)

## Step 3: Configure App Groups

Both the main app and the widget need to share data via App Groups:

### For the Main App Target:

1. Select the **App** target in Xcode
2. Go to the **Signing & Capabilities** tab
3. Click **+ Capability** and add **App Groups**
4. Click the **+** button and add: `group.com.countdown.app`

### For the Widget Target:

1. Select the **CountdownWidget** target in Xcode
2. Go to the **Signing & Capabilities** tab
3. Click **+ Capability** and add **App Groups**
4. Click the **+** button and add the same group: `group.com.countdown.app`

## Step 4: Update Widget Target Build Settings

1. Select the **CountdownWidget** target
2. Go to **Build Settings**
3. Search for **iOS Deployment Target**
4. Set it to **16.0** or higher (required for App Intents)

## Step 5: Build and Run

1. Select your iPhone device or simulator
2. Select the **App** scheme (not CountdownWidget)
3. Build and run the app
4. Create at least one countdown in the app
5. Go to your home screen and add a widget:
   - Long press on home screen
   - Tap **+** in the top left
   - Search for "Countdown"
   - Select your preferred widget size
   - Tap the widget to configure which countdown to display

## Troubleshooting

### Widget shows "No Countdown"
- Make sure you've created at least one countdown in the app
- Check that App Groups are configured correctly on both targets
- Try force-quitting and reopening the app

### Widget doesn't update
- Widgets refresh on a schedule (approximately every 1-15 minutes)
- The app triggers a refresh when countdowns are changed
- You can force refresh by editing and saving a countdown

### Build errors
- Ensure all Swift files are added to the CountdownWidget target
- Check that the Shared folder files are included
- Verify App Groups capability is enabled on both targets

## File Structure

```
CountdownWidget/
├── CountdownWidget.swift         # Main widget entry point & timeline provider
├── Info.plist                    # Widget extension configuration
├── XCODE_SETUP.md               # This setup guide
├── Assets.xcassets/             # Widget assets
├── Shared/
│   ├── CountdownEvent.swift     # Data models matching React types
│   ├── WidgetDataSync.swift     # App Group data synchronization
│   └── SelectCountdownIntent.swift # App Intent for widget configuration
└── Views/
    ├── SmallWidgetView.swift    # 155x155 widget layout
    ├── MediumWidgetView.swift   # 329x155 widget layout
    ├── LargeWidgetView.swift    # 329x329 widget layout
    ├── ExtraLargeWidgetView.swift # 329x400 widget layout
    └── EmptyWidgetView.swift    # Empty state when no countdown selected
```
