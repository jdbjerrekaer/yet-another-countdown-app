# App Store Resubmission Guide

This guide addresses the App Store review rejection issues and provides steps for resubmission.

## Issues Fixed in Code

### ✅ Guideline 5.1.1 - Privacy - Data Collection and Storage
**Issue:** ATT prompt was shown after user denied tracking in GDPR/UMP flow.

**Fix:** Updated `src/lib/ads/adsManager.ts` to only request ATT authorization when:
- UMP consent status is `OBTAINED` (user consented) or `NOT_REQUIRED` (not in EEA/UK)
- AND ATT status is `notDetermined` (hasn't been asked yet)

If user denies GDPR consent, ATT prompt will NOT be shown, respecting the user's choice.

### ✅ Guideline 2.1 - App Completeness (Unlock Bug)
**Issue:** No progress/feedback after tapping 'Unlock' button.

**Fixes:**
- Added store readiness check before enabling purchase buttons
- Added clear error messages when purchase fails
- Added 30-second timeout to prevent indefinite spinners
- Disabled buttons when products aren't loaded or store isn't ready
- Improved error handling to show user-friendly messages

### ✅ Guideline 2.1 - App Completeness (Button Unresponsive on iPad)
**Issue:** Remove ADS button was unresponsive on iPad Air 11-inch (M3) running in iPhone compatibility mode.

**Fixes:**
- Added explicit touch-action CSS property for better compatibility mode support
- Ensured pointer-events are properly set to prevent blocking
- Added minimum height to ensure adequate touch target size
- Improved onClick handler to check store readiness before attempting purchase
- Added haptic feedback on purchase attempt for better user feedback
- Prevented multiple simultaneous purchase attempts
- Improved error messages when products fail to load

**Note:** The app is configured as iPhone-only (`TARGETED_DEVICE_FAMILY = 1`), so it runs in iPhone compatibility mode on iPad. The fixes ensure the button works correctly in this compatibility mode.

## App Store Connect Steps Required

### 1. Guideline 2.3.3 - Accurate Metadata (iPad Screenshots)

**Problem:** iPad screenshots show iPhone device frames.

**Steps to Fix:**
1. Open App Store Connect → Your App → App Store → iOS App
2. Go to "App Preview and Screenshots" section
3. Click "View All Sizes in Media Manager" (important - this shows all device sizes)
4. For iPad screenshots:
   - Use an actual iPad device or iPad simulator
   - Capture screenshots showing the iPad UI (not iPhone UI)
   - Ensure screenshots show iPad-specific layouts if your app has them
5. Upload new iPad screenshots (all required sizes):
   - 12.9-inch iPad Pro (3rd generation)
   - 11-inch iPad Pro (3rd generation)
   - 10.5-inch iPad Pro
   - 9.7-inch iPad
6. Verify each screenshot shows the correct device frame
7. Save changes

**Note:** Screenshots must accurately reflect the app as it appears on each device type. Marketing materials or incorrect device frames are not acceptable.

### 2. Guideline 2.1 - App Completeness (In-App Purchase Submission)

**Problem:** In-app purchase products have not been submitted for review. The app includes references to "Remove ads" IAP but the associated in-app purchase products have not been submitted for review.

**CRITICAL:** This must be completed before resubmitting the app. App Review cannot test the purchase flow without submitted IAP products.

**Steps to Fix:**

#### Step 1: Create/Configure IAP Products
1. Open App Store Connect → Your App → Features → In-App Purchases
2. Click the "+" button to create a new in-app purchase (if products don't exist)
3. Select "Non-Consumable" as the product type
4. Create two products with these Product IDs:
   - `com.jonatanbjerrekaer.countdown.remove_ads` (Standard tier)
   - `com.jonatanbjerrekaer.countdown.remove_ads_supporter` (Supporter tier)

#### Step 2: Configure Each Product
For each product (`com.jonatanbjerrekaer.countdown.remove_ads` and `com.jonatanbjerrekaer.countdown.remove_ads_supporter`):

1. **Reference Name** (internal, not shown to users):
   - Standard: "Remove Ads - Standard"
   - Supporter: "Remove Ads - Supporter"

2. **Product ID** (must match exactly):
   - `com.jonatanbjerrekaer.countdown.remove_ads`
   - `com.jonatanbjerrekaer.countdown.remove_ads_supporter`

3. **Price and Availability**:
   - Set appropriate pricing for your region
   - Make it available in all countries where your app is available

4. **Display Name** (shown to users):
   - Standard: "Remove Ads" or similar
   - Supporter: "Remove Ads (Supporter)" or similar

5. **Description** (shown to users):
   - Standard: "Remove all banner and interstitial ads from the app."
   - Supporter: "Remove all ads plus support the development of the app."

6. **App Review Screenshot** (REQUIRED - cannot submit without this):
   - **This is critical** - App Review requires a screenshot showing the purchase UI
   - Take a screenshot of the Remove Ads modal/screen in your app
   - Must show the in-app purchase UI clearly
   - Can be the same screenshot for both products if they appear on the same screen
   - Minimum size: 640x920 pixels (or larger)
   - File format: PNG or JPEG
   - **Tip:** Use an iPad screenshot since the review was done on iPad

7. Click "Save" after configuring each product

#### Step 3: Submit IAP Products for Review
1. After both products are configured and saved:
   - Go to the In-App Purchases list
   - Select both products (or submit them individually)
   - Click "Submit for Review" button
   - You may need to wait a few minutes for the status to update

#### Step 4: Upload New App Binary
**IMPORTANT:** After submitting IAP products, you MUST upload a new app binary:
1. Build and upload a new version of your app (can be the same version number or increment)
2. The binary must be submitted AFTER the IAP products are submitted
3. This ensures App Review can test the purchase flow with the submitted products

**App Review Screenshot Requirements:**
- Must show the actual purchase screen/UI in your app
- Should clearly show the product being purchased
- Can be taken from iPhone or iPad (iPad recommended since review was on iPad)
- File format: PNG or JPEG
- Minimum dimensions: 640x920 pixels
- Must be uploaded before you can submit the IAP product for review

**Common Issues:**
- If you can't find "Submit for Review" button, make sure:
  - All required fields are filled (especially App Review Screenshot)
  - Product is saved
  - Product status shows as "Ready to Submit"
- If products don't appear in your app:
  - Verify Product IDs match exactly (case-sensitive)
  - Wait a few minutes after creating products
  - Test with a sandbox account

### 3. Guideline 5.1.1 - Review Notes (Regional Differences)

**If your app behaves differently in different regions:**

Add to "Review Notes" section in App Store Connect:

```
Privacy & Consent Flow:

The app uses Google UMP (User Messaging Platform) for GDPR compliance in EEA/UK regions. 
For users in EEA/UK, a GDPR consent form is shown first. For users outside EEA/UK, 
consent is not required.

App Tracking Transparency (ATT) is only requested if:
1. User is in EEA/UK and consented to tracking in GDPR form, OR
2. User is outside EEA/UK (where GDPR consent is not required)

If a user denies tracking in the GDPR form, the ATT prompt will NOT be shown, 
respecting their choice.

To test the GDPR flow:
- Use a device with location set to an EEA country (e.g., Germany, France)
- Or use a VPN to appear as if in EEA
- The GDPR consent form should appear on first launch

To test non-EEA flow:
- Use a device with location set to a non-EEA country (e.g., United States)
- No GDPR form should appear, but ATT may still appear if not previously answered
```

**If your app does NOT behave differently:**

Add to "Review Notes":

```
Privacy & Consent Flow:

The app uses Google UMP for GDPR compliance. App Tracking Transparency (ATT) 
is only requested when UMP consent allows tracking. If a user denies tracking 
in the GDPR/UMP flow, the ATT prompt will NOT be shown, respecting their choice.

The app does not have region-specific behavior differences for privacy/consent flows.
```

## Submission Checklist

Before resubmitting, verify:

- [ ] iPad screenshots uploaded with correct iPad device frames
- [ ] All in-app purchase products created and configured in App Store Connect
- [ ] App Review screenshots added to each IAP product (REQUIRED)
- [ ] All IAP products submitted for review
- [ ] New app binary uploaded (AFTER IAP products are submitted)
- [ ] Review Notes section updated with privacy flow information
- [ ] Test the purchase flow on iPad to ensure button is responsive
- [ ] Test the purchase flow on iPhone to ensure it works
- [ ] Test the consent flow to ensure ATT is not shown after GDPR denial
- [ ] Verify IAP products appear correctly in the app

## Testing Recommendations

1. **Test Purchase Flow:**
   - Open the app
   - Tap to open Remove Ads modal
   - Tap "Unlock" button
   - Verify purchase dialog appears
   - Verify error handling if purchase fails
   - Verify success feedback (confetti) if purchase succeeds

2. **Test Consent Flow:**
   - Fresh install or reset consent in Settings
   - If in EEA: Verify GDPR form appears first
   - Deny tracking in GDPR form
   - Verify ATT prompt does NOT appear
   - Verify app continues to work normally

3. **Test Screenshots:**
   - Verify iPad screenshots show iPad UI
   - Verify iPhone screenshots show iPhone UI
   - Verify all required sizes are uploaded

## Additional Notes

- The code changes ensure ATT is only requested when appropriate
- Purchase flow now has proper error handling and user feedback
- All fixes are backward compatible and don't break existing functionality
- Reviewers should be able to test both consent flows (EEA and non-EEA) if needed
