# App Store Review Notes

Copy and paste the content below into the "Review Notes" section in App Store Connect when submitting your app for review.

---

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
- **iPad Compatibility:** The app runs in iPhone compatibility mode on iPad. Product loading has been hardened with retry logic to handle transient StoreKit initialization delays in the sandbox environment. If products don't load immediately, the app will automatically retry up to 3 times before showing an error.

---

**Important IAP Clarifications:**
- The app contains **only two non-consumable in-app purchases** (Remove Ads Standard and Remove Ads Supporter)
- **No subscription products** are included in this app
- Product loading has been optimized for iPad sandbox environments where StoreKit initialization can be slower

**Note:** The app does not have region-specific behavior differences for privacy/consent flows beyond the standard GDPR requirements for EEA/UK users.
