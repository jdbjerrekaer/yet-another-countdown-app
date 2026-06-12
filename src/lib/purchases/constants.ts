export const IAP_TIMING = {
  bootstrapTimeoutMs: 10000,
  bootstrapPollIntervalMs: 500,
  storeReadyTimeoutMs: 6000,
  catalogStallTimeoutMs: 12000,
  catalogSettleDebounceMs: 180,
  purchaseEntitlementTimeoutMs: 12000,
  restoreEntitlementWaitMs: 6000,
  productFetchMaxAttempts: 3,
  productFetchRetryBaseDelayMs: 700,
  devPurchaseDelayMs: 800,
} as const;
