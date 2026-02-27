import { registerPlugin } from "@capacitor/core";

export interface StoreKitDiagnosticsSnapshot {
  timestamp: string;
  iosVersion?: string;
  available?: boolean;
  error?: string;
  currentEntitlements?: StoreKitEntitlement[];
  recentTransactions?: StoreKitTransaction[];
  transactionCount?: number;
  productStatuses?: StoreKitProductStatus[];
  previousSnapshotTimestamp?: string;
}

export interface StoreKitEntitlement {
  productId: string;
  transactionId?: string;
  purchaseDate?: string;
  transactionState?: string;
  revocationDate?: string;
  expirationDate?: string;
  error?: string;
  verificationFailed?: boolean;
}

export interface StoreKitTransaction {
  productId: string;
  transactionId?: string;
  purchaseDate?: string;
  transactionState?: string;
  revocationDate?: string;
  expirationDate?: string;
  error?: string;
  verificationFailed?: boolean;
}

export interface StoreKitProductStatus {
  productId: string;
  available: boolean;
  displayName?: string;
  description?: string;
  price?: string;
  currencyCode?: string;
  subscriptionInfo?: {
    subscriptionGroupId?: string;
    introductoryOffer?: boolean;
    promotionalOffers?: number;
  };
  subscriptionStatus?: string;
  error?: string;
}

export interface StoreKitDiagnosticsPlugin {
  collectSnapshot(): Promise<StoreKitDiagnosticsSnapshot>;
  syncStore(): Promise<{ success: boolean; error?: string }>;
}

const StoreKitDiagnostics = registerPlugin<StoreKitDiagnosticsPlugin>(
  "StoreKitDiagnosticsPlugin",
  {
    web: () => Promise.resolve({
      collectSnapshot: async () => ({
        timestamp: new Date().toISOString(),
        available: false,
        error: "StoreKit 2 diagnostics only available on native iOS",
      }),
      syncStore: async () => ({
        success: false,
        error: "StoreKit 2 sync only available on native iOS",
      }),
    }),
  }
);

export default StoreKitDiagnostics;
