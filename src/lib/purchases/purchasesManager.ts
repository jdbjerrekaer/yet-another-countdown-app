import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import {
  InAppPurchase2,
  IAPProduct,
} from "@awesome-cordova-plugins/in-app-purchase-2";
import { IAP_RETRY, IAP_TIMING } from "./constants";

type EntitlementListener = (entitled: boolean) => void;

const PREF_REMOVE_ADS = "iap_remove_ads_entitlement";
const PREF_REMOVE_ADS_PRODUCT_ID = "iap_remove_ads_product_id";

const REMOVE_ADS_PRODUCTS = [
  {
    id: "com.countdown.app.remove_ads",
    tier: "standard",
  },
  {
    id: "com.countdown.app.remove_ads_supporter",
    tier: "supporter",
  },
];

let isInitialized = false;
let isDevBuild = false;
let hasRemoveAdsEntitlement = false;
let readyPromise: Promise<void> | null = null;
let readyResolve: (() => void) | null = null;
let initPromise: Promise<void> | null = null;
const entitlementListeners = new Set<EntitlementListener>();
const pendingCancelRejectors = new Map<string, (error: Error) => void>();
let testModeForceLoadFailure = false;

const setEntitlement = async (
  value: boolean,
  persist = true,
  productId?: string,
) => {
  if (hasRemoveAdsEntitlement === value) return;
  hasRemoveAdsEntitlement = value;
  if (persist) {
    await Preferences.set({
      key: PREF_REMOVE_ADS,
      value: value ? "true" : "false",
    });
    if (value && productId) {
      await Preferences.set({
        key: PREF_REMOVE_ADS_PRODUCT_ID,
        value: productId,
      });
    }
    if (!value) {
      await Preferences.remove({ key: PREF_REMOVE_ADS_PRODUCT_ID });
    }
  }
  entitlementListeners.forEach((listener) => listener(value));
};

const loadLocalEntitlement = async () => {
  const { value } = await Preferences.get({ key: PREF_REMOVE_ADS });
  hasRemoveAdsEntitlement = value === "true";
};

const isRemoveAdsProduct = (productId?: string) =>
  Boolean(productId && REMOVE_ADS_PRODUCTS.some((item) => item.id === productId));

const ensureReady = async () => {
  if (!readyPromise) {
    return;
  }
  const startTime = Date.now();
  await Promise.race([
    readyPromise,
    new Promise<void>((resolve) => setTimeout(resolve, IAP_TIMING.ensureReadyTimeoutMs)),
  ]);
  const elapsed = Date.now() - startTime;
  if (elapsed >= IAP_TIMING.ensureReadyTimeoutMs) {
    return;
  }
};

const refreshStore = async () => {
  const refreshResult = InAppPurchase2.refresh();
  await new Promise<void>((resolve, reject) => {
    refreshResult.completed(() => {
      resolve();
    });
    refreshResult.finished(() => {
      resolve();
    });
    refreshResult.cancelled(() => {
      resolve();
    });
    refreshResult.failed(() => {
      reject(new Error("Store refresh failed"));
    });
  });
};

export const PurchasesManager = {
  init: async () => {
    if (initPromise) return initPromise;
    if (isInitialized) return;

    initPromise = (async () => {
      if (isDevBuild) {
        await Preferences.remove({ key: PREF_REMOVE_ADS });
        await Preferences.remove({ key: PREF_REMOVE_ADS_PRODUCT_ID });
      }

      await loadLocalEntitlement();
      isInitialized = true;
      entitlementListeners.forEach((listener) => listener(hasRemoveAdsEntitlement));

      if (!Capacitor.isNativePlatform()) {
        return;
      }
      if (isDevBuild) {
        return;
      }

      try {
        InAppPurchase2.verbosity = InAppPurchase2.ERROR;
        InAppPurchase2.register(
          REMOVE_ADS_PRODUCTS.map((product) => ({
            id: product.id,
            type: InAppPurchase2.NON_CONSUMABLE,
          })),
        );

        readyPromise =
          readyPromise ||
          new Promise<void>((resolve) => {
            readyResolve = resolve;
          });

        InAppPurchase2.ready(() => {
          if (readyResolve) {
            readyResolve();
            readyResolve = null;
          }
        });

        (InAppPurchase2 as unknown as { when: () => { approved: (cb: (p: IAPProduct) => void) => void } })
          .when()
          .approved((product) => {
          if (isRemoveAdsProduct(product.id)) {
            void setEntitlement(true, !isDevBuild, product.id);
            product.finish();
          }
        });

        (InAppPurchase2 as unknown as { when: () => { owned: (cb: (p: IAPProduct) => void) => void } })
          .when()
          .owned((product) => {
          if (isRemoveAdsProduct(product.id)) {
            void setEntitlement(true, !isDevBuild, product.id);
          }
        });

        (InAppPurchase2 as unknown as { when: () => { refunded: (cb: (p: IAPProduct) => void) => void } })
          .when()
          .refunded((product) => {
          if (isRemoveAdsProduct(product.id)) {
            void setEntitlement(false);
          }
        });

        (InAppPurchase2 as unknown as { when: () => { cancelled?: (cb: (p: IAPProduct) => void) => void } })
          .when()
          .cancelled?.((product) => {
          if (isRemoveAdsProduct(product.id)) {
            const rejectPending = pendingCancelRejectors.get(product.id);
            if (rejectPending) {
              rejectPending(new Error("PaymentCancelled"));
              pendingCancelRejectors.delete(product.id);
            }
          }
        });

        void refreshStore().catch(() => {});
        await ensureReady();
      } catch (error) {
        console.warn("[Purchases] Initialization failed", error);
      }
    })();

    return initPromise;
  },

  setDevBuild: (isDev: boolean) => {
    isDevBuild = isDev;
  },

  getProducts: async (): Promise<IAPProduct[]> => {
    await PurchasesManager.init();
    if (!Capacitor.isNativePlatform()) {
      return [];
    }

    if (testModeForceLoadFailure && !isDevBuild) {
      console.warn("[Purchases] TEST MODE: Forcing load failure");
      return [];
    }

    if (isDevBuild) {
      return REMOVE_ADS_PRODUCTS.map((item) => {
        const mockProduct = {
          id: item.id,
          alias: undefined,
          type: InAppPurchase2.NON_CONSUMABLE,
          state: InAppPurchase2.VALID,
          title: item.tier === "supporter" ? "Remove Ads" : "Remove Ads",
          description: item.tier === "supporter" 
            ? "Ad-free plus a thank you for supporting the app."
            : "Remove banners and interstitials.",
          priceMicros: item.tier === "supporter" ? 4990000 : 2990000,
          price: item.tier === "supporter" ? "€4.99" : "€2.99",
          currency: "EUR",
          loaded: true,
          valid: true,
          canPurchase: true,
          owned: false,
        } as IAPProduct;
        return mockProduct;
      });
    }

    await ensureReady();
    
    const rawProductsBeforeRefresh = REMOVE_ADS_PRODUCTS.map((item) => InAppPurchase2.get(item.id));
    const validProductsBeforeRefresh = rawProductsBeforeRefresh.filter(
      (product): product is IAPProduct =>
        !!product && product.loaded && product.valid && Boolean(product.price),
    );
    
    if (validProductsBeforeRefresh.length < REMOVE_ADS_PRODUCTS.length) {
      try {
        await refreshStore();
        await new Promise((resolve) => setTimeout(resolve, IAP_TIMING.postRefreshDelayMs));
      } catch {
        // Continue anyway if refresh fails
      }
    }
    
    const maxRetries = IAP_RETRY.managerMaxAttempts;
    const retryDelay = IAP_TIMING.managerRetryDelayMs;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const rawProducts = REMOVE_ADS_PRODUCTS.map((item) => InAppPurchase2.get(item.id));
      const products = rawProducts.filter(
        (product): product is IAPProduct =>
          !!product && product.loaded && product.valid && Boolean(product.price),
      );
      
      if (products.length >= REMOVE_ADS_PRODUCTS.length) {
        return products;
      }
      
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
    
    const finalProducts = REMOVE_ADS_PRODUCTS.map((item) => InAppPurchase2.get(item.id));
    return finalProducts.filter(
      (product): product is IAPProduct =>
        !!product && product.loaded && product.valid && Boolean(product.price),
    );
  },

  purchaseRemoveAds: async (productId: string) => {
    await PurchasesManager.init();
    if (!Capacitor.isNativePlatform()) {
      throw new Error("Purchases are not available on web.");
    }
    await ensureReady();

    let entitlementResolve: (() => void) | null = null;
    let entitlementReject: ((err: Error) => void) | null = null;
    const entitlementPromise = new Promise<void>((resolve, reject) => {
      entitlementResolve = resolve;
      entitlementReject = reject;
    });

    const checkEntitlement = () => {
      if (hasRemoveAdsEntitlement && entitlementResolve) {
        entitlementResolve();
        entitlementResolve = null;
        entitlementReject = null;
      }
    };
    const removeListener = PurchasesManager.onEntitlementChange(() => {
      checkEntitlement();
    });

    checkEntitlement();
    pendingCancelRejectors.set(productId, (error) => {
      if (entitlementReject) {
        entitlementReject(error);
      }
      entitlementResolve = null;
      entitlementReject = null;
    });

    const orderResult = InAppPurchase2.order(productId);

    try {
      await new Promise<void>((resolve, reject) => {
        orderResult.then(() => resolve());
        orderResult.error((err: unknown) => reject(err));
      });

      const product = InAppPurchase2.get(productId);
      if (product?.owned || hasRemoveAdsEntitlement) {
        removeListener();
        if (entitlementResolve) {
          entitlementResolve();
        }
        return;
      }

      await entitlementPromise;
      removeListener();
      return;
    } catch (error) {
      pendingCancelRejectors.delete(productId);
      removeListener();
      throw error;
    } finally {
      pendingCancelRejectors.delete(productId);
    }
  },

  restorePurchases: async (): Promise<boolean> => {
    await PurchasesManager.init();
    if (!Capacitor.isNativePlatform()) return false;
    await refreshStore();
    await ensureReady();
    
    // Check if any remove ads products are owned after restore
    const ownedProducts = REMOVE_ADS_PRODUCTS.filter((item) => {
      const product = InAppPurchase2.get(item.id);
      return product?.owned === true;
    });
    
    return hasRemoveAdsEntitlement || ownedProducts.length > 0;
  },
  setDevEntitlement: async (value: boolean, productId?: string) => {
    await setEntitlement(value, true, productId);
  },

  setTestMode: (options: { forceLoadFailure: boolean }) => {
    if (process.env.NODE_ENV === "production") return;
    testModeForceLoadFailure = options.forceLoadFailure;
    console.log(`[Purchases] Test mode: forceLoadFailure=${testModeForceLoadFailure}`);
  },

  getTestMode: () => ({
    forceLoadFailure: testModeForceLoadFailure,
  }),

  hasRemoveAdsEntitlement: () => hasRemoveAdsEntitlement,
  getRemoveAdsProducts: () => [...REMOVE_ADS_PRODUCTS],
  isStoreReady: async () => {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }
    if (isDevBuild) {
      return true;
    }
    await PurchasesManager.init();
    if (!readyPromise) {
      return false;
    }
    try {
      await Promise.race([
        readyPromise,
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), IAP_TIMING.storeReadyTimeoutMs),
        ),
      ]);
      return true;
    } catch {
      return false;
    }
  },
  onEntitlementChange: (listener: EntitlementListener) => {
    entitlementListeners.add(listener);
    listener(hasRemoveAdsEntitlement);
    return () => entitlementListeners.delete(listener);
  },
};
