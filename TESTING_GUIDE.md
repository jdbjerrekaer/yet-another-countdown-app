# Testing Guide - Remove ADS Button Fix

This guide explains how to test the button responsiveness fix, especially on iPad (iPhone compatibility mode).

## Quick Start

### 1. Build and Run in Xcode Simulator

```bash
# Build the web app
npm run build

# Sync to iOS
npx cap sync ios

# Open in Xcode
npx cap open ios
```

### 2. Select iPad Simulator

In Xcode:
1. Click the device selector (top toolbar, next to the play button)
2. Choose **iPad Air 11-inch (M3)** or any iPad simulator
3. Click the **Play** button (or press `Cmd + R`)

**Note:** Since your app is iPhone-only (`TARGETED_DEVICE_FAMILY = 1`), it will run in iPhone compatibility mode on iPad, which is exactly what Apple tested.

## Testing the Button Responsiveness

### Test Scenario 1: Button Click Response

1. **Launch the app** in iPad simulator
2. **Open Remove Ads modal:**
   - Look for the Remove Ads button/option in your app
   - Tap to open the modal
3. **Test button responsiveness:**
   - Tap the "Unlock" button (or purchase button)
   - **Expected:** Button should respond immediately with:
     - Visual feedback (button state change)
     - Haptic feedback (if enabled)
     - Loading spinner appears (if products are loading)
     - Purchase dialog appears (if using StoreKit testing)

### Test Scenario 2: StoreKit Configuration Testing

Your project includes `StoreKit.storekit` which allows testing IAP without App Store Connect:

1. **In Xcode, enable StoreKit Testing:**
   - Go to **Product** → **Scheme** → **Edit Scheme...**
   - Select **Run** → **Options** tab
   - Under **StoreKit Configuration**, select `StoreKit.storekit`
   - Click **Close**

2. **Run the app** (the StoreKit config will be active)

3. **Test purchase flow:**
   - Open Remove Ads modal
   - Tap "Unlock" button
   - **Expected:** StoreKit purchase dialog appears
   - Complete the purchase (it's free in StoreKit testing)
   - **Expected:** Confetti animation, ads removed

### Test Scenario 3: Button State When Products Not Available

To test what happens when IAP products aren't loaded (like in App Review before products are submitted):

1. **Disable StoreKit Configuration:**
   - Go to **Product** → **Scheme** → **Edit Scheme...**
   - Select **Run** → **Options** tab
   - Under **StoreKit Configuration**, select **None**
   - Click **Close**

2. **Run the app**

3. **Test button behavior:**
   - Open Remove Ads modal
   - **Expected:** Button should still be clickable (not disabled)
   - Tap the button
   - **Expected:** Error message appears: "Unable to load products" or similar
   - Button should not be stuck/unresponsive

### Test Scenario 4: Deterministic Reproduction of Apple's "Unable to load products" Error

This test reproduces Apple's reported error scenario deterministically using the built-in test mode.

**Prerequisites:**
- App running in development mode (not production build)
- iPad Air 11-inch (M3) simulator (or matching Apple's review device)
- StoreKit Configuration enabled (for normal flow verification)

**Step 1: Enable Test Mode (Force Load Failure)**

1. **Launch the app** in iPad simulator
2. **Open Remove Ads modal**
3. **Enable test mode** using one of these methods:
   - **Method A (UI):** In the modal, find the yellow "DEV" banner at the bottom. Click "Toggle Test Mode" button.
   - **Method B (Console):** Open Safari Web Inspector (Develop → Simulator → [Your App]) or Xcode console, then run:
     ```javascript
     window.toggleIAPTestMode()
     ```
4. **Verify test mode is enabled:**
   - UI banner should show: "DEV: Test mode: FAILURE ON"
   - Console should log: `[IAP Test Mode] Toggled: forceLoadFailure=true`

**Step 2: Reproduce the Error**

1. **Close the Remove Ads modal** (test mode persists across modal opens)
2. **Reopen the Remove Ads modal**
3. **Observe the loading state:**
   - Modal shows loading spinner initially
   - After retries complete (~14 seconds total tolerance), error banner appears
4. **Expected Result:**
   - Red error banner displays: **"Unable to load products right now."**
   - Products list is empty (no purchase buttons visible)
   - Console logs: `[Purchases] TEST MODE: Forcing load failure for local reproduction`

**Step 3: Test Purchase Attempt During Failure State**

1. **With test mode still enabled**, if products somehow appear, tap "Unlock"
2. **Expected:** Purchase should be blocked with "Unable to load products right now." error
3. **Verify:** No purchase sheet appears, error message is clear

**Step 4: Verify Recovery Path**

1. **Disable test mode:**
   - Click "Toggle Test Mode" button again, OR
   - Run in console: `window.toggleIAPTestMode()`
2. **Verify test mode is disabled:**
   - UI banner shows: "DEV: Test mode: NORMAL"
   - Console logs: `[IAP Test Mode] Toggled: forceLoadFailure=false`
3. **Close and reopen the Remove Ads modal**
4. **Expected Result:**
   - Products load successfully (both "Remove Ads" options appear)
   - Prices display correctly
   - "Unlock" buttons are enabled
   - No error banner
5. **Test purchase flow:**
   - Tap "Unlock" on either product
   - **Expected:** StoreKit purchase sheet appears (if StoreKit config is enabled)
   - Purchase completes successfully

**Step 5: Verify Retry Logic**

1. **Re-enable test mode** (forceLoadFailure=true)
2. **Open Remove Ads modal**
3. **Observe retry behavior:**
   - Watch console logs for retry attempts
   - Modal should retry up to 4 times with 1000ms delays
   - Total wait time: ~14 seconds before showing error
4. **Expected:** Error appears only after all retries are exhausted

**Validation Checklist:**

- [ ] Test mode can be toggled via UI button
- [ ] Test mode can be toggled via console command
- [ ] With test mode ON: Modal shows "Unable to load products right now." error
- [ ] With test mode ON: Products list is empty
- [ ] With test mode OFF: Products load successfully
- [ ] With test mode OFF: Purchase flow works normally
- [ ] Retry logic executes correctly (4 attempts, 1000ms delays)
- [ ] Error message matches Apple's reported error text exactly
- [ ] No production behavior changes when test mode is disabled

**Important Notes:**

- **Test mode is dev-only:** The `setTestMode` API is disabled in production builds (`process.env.NODE_ENV === "production"`)
- **Sandbox propagation delay:** Apple's sandbox can take up to 1 hour for metadata changes to propagate. If testing with real sandbox accounts, allow time for changes to appear.
- **StoreKit Configuration:** For most reliable testing, use StoreKit.storekit configuration file in Xcode scheme settings
- **Console access:** To access console in simulator:
  - Safari: Develop → Simulator → [Your App Name]
  - Xcode: View → Debug Area → Activate Console (Cmd+Shift+Y)

## What to Look For

### ✅ Success Indicators

- Button responds immediately to tap (no delay)
- Visual feedback (button state changes)
- Loading spinner appears when processing
- Error messages display clearly if purchase fails
- Button is not disabled when products aren't loaded (shows error instead)

### ❌ Issues to Watch For

- Button doesn't respond to tap (stays in same state)
- Button appears disabled when it shouldn't be
- No visual feedback when tapping
- Button gets stuck in loading state
- No error message when products fail to load

## Testing on Physical Device (Recommended)

For the most accurate testing, especially for touch responsiveness:

### 1. Connect iPad to Mac

1. Connect iPad via USB
2. Trust the computer on iPad if prompted
3. In Xcode, select your iPad from device list
4. You may need to configure code signing

### 2. Run on Device

1. Select your iPad in Xcode
2. Click **Play** button
3. App will install and launch on iPad

### 3. Test Purchase Flow

**Important:** On a physical device, you'll need:
- A sandbox test account (created in App Store Connect)
- Sign out of your regular Apple ID in Settings → App Store
- Sign in with sandbox account when prompted during purchase

**To create sandbox test account:**
1. Go to App Store Connect → Users and Access → Sandbox Testers
2. Click "+" to add new tester
3. Use a unique email (can be fake, like `test1@example.com`)
4. Set password and country

## Testing Checklist

### General IAP Testing
- [ ] App launches successfully on iPad simulator
- [ ] Remove Ads modal opens correctly
- [ ] Purchase buttons are visible and properly sized
- [ ] Buttons respond immediately to tap
- [ ] Visual feedback appears on tap
- [ ] Loading state works correctly
- [ ] Error messages display when products unavailable
- [ ] Purchase flow works with StoreKit configuration
- [ ] Button works in iPhone compatibility mode (scaled view)
- [ ] Tested on actual iPad device (if available)

### Deterministic Repro Test (Test Scenario 4)
- [ ] Test mode toggle works via UI button
- [ ] Test mode toggle works via console command (`window.toggleIAPTestMode()`)
- [ ] With test mode ON: "Unable to load products right now." error appears
- [ ] With test mode ON: Products list is empty after retries
- [ ] With test mode OFF: Products load successfully
- [ ] With test mode OFF: Purchase flow completes normally
- [ ] Retry logic executes (4 attempts, ~14s total tolerance)
- [ ] Error message text matches Apple's reported error exactly

## Debugging Tips

### Check Console Logs

In Xcode, open the console (View → Debug Area → Activate Console) and look for:

```
[Purchases] Purchase failed
[Purchases] Failed to load products
[Purchases] Initialization failed
```

### Enable Verbose Logging

If you need more detailed logs, you can temporarily modify `purchasesManager.ts`:

```typescript
InAppPurchase2.verbosity = InAppPurchase2.DEBUG; // Instead of ERROR
```

### Test Button State

Add temporary logging to see button state:

```typescript
console.log('Button disabled:', {
  isNative,
  hasRemoveAds,
  isBusy,
  loading,
  storeReady,
  isDevBuild
});
```

## Limitations of Simulator Testing

1. **Haptic Feedback:** May not work in simulator (works on device)
2. **Touch Sensitivity:** Simulator touch may feel different than real device
3. **StoreKit:** Works well in simulator with StoreKit config file
4. **Real IAP:** Cannot test actual App Store purchases in simulator (use sandbox on device)

## Next Steps After Testing

1. **If button works:** Proceed with IAP product submission in App Store Connect
2. **If button still unresponsive:** Check console logs and verify:
   - Products are loading correctly
   - StoreKit configuration is active
   - No JavaScript errors in console
   - Button CSS/styles aren't blocking touches

## Additional Resources

- [Apple: Testing In-App Purchases](https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases_with_sandbox)
- [StoreKit Configuration File](https://developer.apple.com/documentation/xcode/configuring-storekit-testing-in-xcode)
- [Capacitor iOS Development](https://capacitorjs.com/docs/ios)
