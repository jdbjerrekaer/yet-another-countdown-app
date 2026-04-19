# App Store Resubmission Guide

This guide reflects the current March 16, 2026 rejection state and the replacement IAP product IDs now used by the app.

## Current State

- The app now requests these two non-consumable products:
  - `com.jonatanbjerrekaer.countdown.remove_ads`
  - `com.jonatanbjerrekaer.countdown.remove_ads_supporter`
- The App Store build should no longer show raw internal StoreKit failure text in the visible paywall.
- The current App Store Connect blocker is not product-ID mismatch anymore. It is the IAP submission state: the replacement products must leave `Developer Action Needed` / `Rejected`, be reattached to the next app version, and be resubmitted together with that version.

## Code Fix Included

### Guideline 2.1(b) - Visible IAP Error Message

**Problem:** App Review rejected the build because the paywall visibly showed an internal StoreKit error reason.

**Fix:** The release/App Store paywall still shows the generic load error card with Retry and Restore, but it no longer renders the raw `StoreKit did not return any priced products` reason to users. Full diagnostics remain available in device logs for debugging.

## App Store Connect Steps Required

### 1. Fix The Rejected Replacement IAPs

Open App Store Connect → Your App → In-App Purchases.

For `Remove Ads - Standard`:
1. Open the product.
2. Recheck the App Store localization.
3. Make sure the display name is `Remove Ads`.
4. Make sure the description describes the standard tier only.
5. Keep the App Review screenshot uploaded.
6. Keep the review notes populated.
7. Save the product.

For `Remove Ads - Supporter`:
1. Open the product.
2. Recheck the App Store localization.
3. Make sure the display name remains `Remove Ads - Supporter` or `Remove Ads (Supporter)`.
4. Make sure the description describes the supporter tier only.
5. Keep the App Review screenshot uploaded.
6. Keep the review notes populated.
7. Save the product.

Expected result:
- Both products leave `Developer Action Needed`.
- Both products move to a reviewable state such as `Ready to Submit`.

### 2. Resubmit The IAPs

Once both products are out of `Developer Action Needed`:
1. Return to the IAP list.
2. Select both products.
3. Submit both for review again.

### 3. Use A Fresh App Version (`1.0.2`)

Do not keep recycling the rejected `1.0.1` review cycle.

1. Create or use app version `1.0.2`.
2. Select the build that contains the replacement IAP product IDs.
3. In the version page, go to `In-App Purchases and Subscriptions`.
4. Attach:
   - `Remove Ads - Standard`
   - `Remove Ads - Supporter`
5. Save the version.

Before submitting, verify the submission page shows exactly:
- app version `1.0.2`
- `Remove Ads - Standard`
- `Remove Ads - Supporter`

### 4. Review Notes

Paste the current note from `APP_STORE_REVIEW_NOTES.md` into App Store Connect.

Important points to keep in the note:
- The app contains only the two non-consumable IAPs above.
- The paywall no longer exposes internal StoreKit failure text to users.
- Full diagnostics remain available in device logs.
- The paywall waits for real App Store pricing before showing native offers.

## Submission Checklist

- [ ] Both replacement IAPs are out of `Developer Action Needed`
- [ ] Standard IAP display name is corrected to `Remove Ads`
- [ ] App Review screenshots remain attached to both IAPs
- [ ] Both IAPs are resubmitted for review
- [ ] App version `1.0.2` exists
- [ ] The correct build is attached to `1.0.2`
- [ ] `In-App Purchases and Subscriptions` shows both IAPs attached
- [ ] Review notes are updated with the March 16, 2026 reply
- [ ] The submission page shows the app version plus both IAPs

## Testing Recommendations

### Real Device / TestFlight

1. Fresh install on iPhone.
2. Open `Remove Ads` immediately after launch.
3. Verify priced offers appear.
4. If loading fails, verify the visible paywall shows only the generic error text, not the raw StoreKit reason.
5. Complete a purchase for the standard tier.
6. Reinstall or clear local state.
7. Verify `Restore Purchases` restores entitlement.

Repeat the same checks on iPad hardware, since App Review tested on iPad Air 11-inch (M3) running iPadOS 26.3.1 on March 16, 2026.

### Debugging

- Use Xcode/device logs to inspect the structured `Catalog load failed` output if product loading still fails after the IAPs are resubmitted.
- Do not rely on the visible paywall text in release builds for StoreKit root-cause details anymore.
