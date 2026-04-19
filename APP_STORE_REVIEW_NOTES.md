# App Store Review Notes

Copy and paste the content below into the "Review Notes" section in App Store Connect when submitting your app for review.

---

## Reply For March 16, 2026 IAP Rejection

This build addresses the Guideline 2.1(b) in-app purchase issue reported on March 16, 2026 for submission `4172811a-8ffd-4d00-925e-b96e031761fa`.

- We kept the iOS paywall on the StoreKit-backed product loading path so the app still waits for real App Store pricing before rendering native purchase options.
- We removed the raw internal StoreKit failure reason from the visible paywall in App Store builds. If product loading still fails, the app now shows only the generic user-facing recovery state while full diagnostics remain available in device logs.
- We corrected and resubmitted the two non-consumable products used by the app:
  - `com.jonatanbjerrekaer.countdown.remove_ads`
  - `com.jonatanbjerrekaer.countdown.remove_ads_supporter`
- We retested the `Remove Ads` flow in sandbox on real hardware, including price loading, purchase, and explicit Restore Purchases behavior.

## Privacy & Consent Flow

The app uses Google UMP (User Messaging Platform) for GDPR compliance in EEA/UK regions. For users in EEA/UK, a GDPR consent form is shown first. For users outside EEA/UK, consent is not required.

**App Tracking Transparency (ATT) is only requested if:**
1. User is in EEA/UK and consented to tracking in GDPR form, OR
2. User is outside EEA/UK (where GDPR consent is not required)

**Important:** If a user denies tracking in the GDPR form, the ATT prompt will NOT be shown, respecting their choice. This ensures users are not asked to allow tracking after they have already declined.

**To test the GDPR flow:**
- Use a device with location set to an EEA country (e.g., Germany, France)
- Or use a VPN to appear as if in EEA
- The GDPR consent form should appear on first launch
- If you deny tracking in the GDPR form, verify that the ATT prompt does NOT appear

**To test non-EEA flow:**
- Use a device with location set to a non-EEA country (e.g., United States)
- No GDPR form should appear, but ATT may still appear if not previously answered

**In-App Purchase Testing:**
- Open the app and tap the "Remove Ads" option
- Two purchase options are available: Standard and Supporter tiers
- Both are non-consumable, one-time purchases (no subscriptions)
- Test the purchase flow and restore purchases functionality
- **iPad Compatibility:** The app runs in iPhone compatibility mode on iPad. The paywall now waits for priced sandbox products before showing purchase buttons, and restore/account sync is only triggered from the explicit Restore Purchases action.

---

**Important IAP Clarifications:**
- The app contains **only two non-consumable in-app purchases** (Remove Ads Standard and Remove Ads Supporter)
- **No subscription products** are included in this app
- Product loading has been optimized for iPad sandbox environments where StoreKit initialization can be slower, and the App Store build no longer surfaces internal StoreKit failure text in the visible paywall

**Note:** The app does not have region-specific behavior differences for privacy/consent flows beyond the standard GDPR requirements for EEA/UK users.
