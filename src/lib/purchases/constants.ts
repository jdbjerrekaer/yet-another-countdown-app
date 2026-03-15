export const IAP_TIMING = {
  bootstrapTimeoutMs: 10000,
  bootstrapPollIntervalMs: 150,
  storeReadyTimeoutMs: 6000,
  catalogStallTimeoutMs: 12000,
  catalogSettleDebounceMs: 180,
  purchaseEntitlementTimeoutMs: 12000,
  devPurchaseDelayMs: 800,
} as const;
