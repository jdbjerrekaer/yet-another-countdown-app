import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import {
  InAppPurchase2,
  IAPProduct,
} from "@awesome-cordova-plugins/in-app-purchase-2";

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
const entitlementListeners = new Set<EntitlementListener>();

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
  if (!readyPromise) return;
  await Promise.race([
    readyPromise,
    new Promise<void>((resolve) => setTimeout(resolve, 5000)),
  ]);
};

const refreshStore = async () => {
  const refreshResult = InAppPurchase2.refresh();
  await new Promise<void>((resolve, reject) => {
    refreshResult.completed(() => resolve());
    refreshResult.finished(() => resolve());
    refreshResult.cancelled(() => resolve());
    refreshResult.failed(() => reject(new Error("Store refresh failed")));
  });
};

export const PurchasesManager = {
  init: async () => {
    if (isInitialized) return;
    isInitialized = true;

    if (isDevBuild) {
      // Reset entitlement on dev build app start as requested
      await Preferences.remove({ key: PREF_REMOVE_ADS });
      await Preferences.remove({ key: PREF_REMOVE_ADS_PRODUCT_ID });
    }

    await loadLocalEntitlement();
    entitlementListeners.forEach((listener) => listener(hasRemoveAdsEntitlement));

    if (!Capacitor.isNativePlatform()) return;

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

      InAppPurchase2.when("product").approved((product) => {
        if (isRemoveAdsProduct(product.id)) {
          void setEntitlement(true, !isDevBuild, product.id);
          product.finish();
        }
      });

      InAppPurchase2.when("product").owned((product) => {
        if (isRemoveAdsProduct(product.id)) {
          void setEntitlement(true, !isDevBuild, product.id);
        }
      });

      InAppPurchase2.when("product").refunded((product) => {
        if (isRemoveAdsProduct(product.id)) {
          void setEntitlement(false);
        }
      });

      await refreshStore();
      await ensureReady();
    } catch (error) {
      console.warn("[Purchases] Initialization failed", error);
    }
  },

  setDevBuild: (isDev: boolean) => {
    isDevBuild = isDev;
  },

  getProducts: async (): Promise<IAPProduct[]> => {
    await PurchasesManager.init();
    if (!Capacitor.isNativePlatform()) return [];
    await ensureReady();
    return REMOVE_ADS_PRODUCTS.map((item) => InAppPurchase2.get(item.id)).filter(
      Boolean,
    ) as IAPProduct[];
  },

  purchaseRemoveAds: async (productId: string) => {
    await PurchasesManager.init();
    if (!Capacitor.isNativePlatform()) {
      throw new Error("Purchases are not available on web.");
    }
    await ensureReady();
    const orderResult = InAppPurchase2.order(productId);
    await new Promise<void>((resolve, reject) => {
      orderResult.then(() => resolve());
      orderResult.error((err: unknown) => reject(err));
    });
    const product = InAppPurchase2.get(productId);
    if (product?.owned) {
      await setEntitlement(true, true, productId);
    }
  },

  restorePurchases: async () => {
    await PurchasesManager.init();
    if (!Capacitor.isNativePlatform()) return;
    await refreshStore();
    await ensureReady();
  },
  setDebugEntitlement: async (value: boolean, productId?: string) => {
    await setEntitlement(value, true, productId);
  },

  hasRemoveAdsEntitlement: () => hasRemoveAdsEntitlement,
  getRemoveAdsProducts: () => [...REMOVE_ADS_PRODUCTS],
  onEntitlementChange: (listener: EntitlementListener) => {
    entitlementListeners.add(listener);
    listener(hasRemoveAdsEntitlement);
    return () => entitlementListeners.delete(listener);
  },
};
