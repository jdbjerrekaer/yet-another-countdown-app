import { registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

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

export interface StoreKitFetchedProduct {
  productId: string;
  available: boolean;
  displayName?: string;
  description?: string;
  price?: string;
  currencyCode?: string;
  error?: string;
}

export interface StoreKitProductFetchResult {
  timestamp: string;
  products: StoreKitFetchedProduct[];
  error?: string;
}

export interface StoreKitEntitlementsResult {
  timestamp: string;
  entitlements: StoreKitEntitlement[];
  error?: string;
}

export interface StoreKitDiagnosticsPlugin {
  collectSnapshot(): Promise<StoreKitDiagnosticsSnapshot>;
  fetchProducts(): Promise<StoreKitProductFetchResult>;
  syncStore(): Promise<{ success: boolean; error?: string }>;
  getEntitlements(): Promise<StoreKitEntitlementsResult>;
  addListener(
    eventName: "transactionUpdated",
    listenerFunc: (data: StoreKitEntitlement) => void,
  ): Promise<PluginListenerHandle>;
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
      fetchProducts: async () => ({
        timestamp: new Date().toISOString(),
        error: "StoreKit 2 product fetch only available on native iOS",
        products: [],
      }),
      syncStore: async () => ({
        success: false,
        error: "StoreKit 2 sync only available on native iOS",
      }),
      getEntitlements: async () => ({
        timestamp: new Date().toISOString(),
        entitlements: [],
        error: "StoreKit 2 entitlements only available on native iOS",
      }),
      addListener: async () => ({ remove: async () => {} }),
    }),
  }
);

export default StoreKitDiagnostics;
