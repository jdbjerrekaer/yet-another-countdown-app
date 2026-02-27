export const IAP_TIMING = {
  ensureReadyTimeoutMs: 8000,
  storeReadyTimeoutMs: 4000,
  modalRetryDelayMs: 1500,
  managerRetryDelayMs: 1200,
  postRefreshDelayMs: 800,
  devPurchaseDelayMs: 800,
} as const;

export const IAP_RETRY = {
  modalMaxAttempts: 5,
  managerMaxAttempts: 4,
} as const;
