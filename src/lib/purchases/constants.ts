export const IAP_TIMING = {
  ensureReadyTimeoutMs: 5000,
  storeReadyTimeoutMs: 2500,
  modalRetryDelayMs: 1000,
  managerRetryDelayMs: 800,
  postRefreshDelayMs: 500,
  devPurchaseDelayMs: 800,
} as const;

export const IAP_RETRY = {
  modalMaxAttempts: 4,
  managerMaxAttempts: 3,
} as const;
