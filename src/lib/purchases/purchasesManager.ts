import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import {
  IAPError,
  InAppPurchase2,
  IAPProduct,
} from "@awesome-cordova-plugins/in-app-purchase-2";
import { IAP_TIMING } from "./constants";
import StoreKitDiagnostics, {
  StoreKitFetchedProduct,
  StoreKitProductFetchResult,
  StoreKitDiagnosticsSnapshot,
} from "../../plugins/StoreKitDiagnosticsPlugin";

type EntitlementListener = (entitled: boolean) => void;
type CatalogListener = (result: CatalogLoadResult) => void;
type CatalogStatus = "loading" | "loaded" | "partial" | "unavailable";
type CatalogProductState =
  | "pending"
  | "loaded_no_price"
  | "loaded_priced"
  | "invalid"
  | "error";
type CatalogOperation = "passive" | "restore";
type CatalogSource = "storekit2" | "cordova-plugin";
type StoreKitComparisonStatus =
  | "unknown"
  | "aligned"
  | "wrapper_plugin_hydration_failure"
  | "app_store_or_sandbox_missing_prices";

type CatalogLoadOptions = {
  reason?: string;
  force?: boolean;
  operation?: CatalogOperation;
};

type CatalogProductDiagnostics = {
  state: CatalogProductState;
  lastEvent: string | null;
  message: string | null;
  code: number | null;
  updatedAt: number | null;
};

type CatalogDiagnostics = {
  storeReady: boolean;
  cordovaReady: boolean;
  pluginAvailable: boolean;
  bootstrapInProgress: boolean;
  bootstrapStartedAt: number | null;
  bootstrapCompletedAt: number | null;
  bootstrapError: string | null;
  initAttempts: number;
  syncError: string | null;
  loadStartedAt: number | null;
  loadCompletedAt: number | null;
  lastSuccessfulProductLoadAt: number | null;
  lastLoadFailureReason: string | null;
  lastStoreErrorCode: number | null;
  lastStoreErrorMessage: string | null;
  catalogSource: CatalogSource;
  storeKitProductFetchError: string | null;
  pricedProductIds: string[];
  unpricedProductIds: string[];
  hasUnpricedProducts: boolean;
  catalogOperation: CatalogOperation;
  receiptLoadErrorIgnored: boolean;
  lastReceiptErrorCode: number | null;
  lastReceiptErrorMessage: string | null;
  storeKitComparisonStatus: StoreKitComparisonStatus;
  storeKitComparisonMessage: string | null;
  productStates: Record<string, CatalogProductDiagnostics>;
  lastDiagnosticsSnapshotAt: number | null;
  hasDiagnosticsSnapshot: boolean;
  diagnosticsSnapshot: {
    timestamp: string;
    productStatuses: StoreKitDiagnosticsSnapshot["productStatuses"];
    entitlementsCount: number;
    transactionsCount: number;
  } | null;
};

export interface CatalogLoadResult {
  status: CatalogStatus;
  products: IAPProduct[];
  unavailableProductIds: string[];
  errorCode: number | null;
  errorMessage: string | null;
  diagnostics: CatalogDiagnostics;
}

const PREF_REMOVE_ADS = "iap_remove_ads_entitlement";
const PREF_REMOVE_ADS_PRODUCT_ID = "iap_remove_ads_product_id";

const REMOVE_ADS_PRODUCTS = [
  {
    id: "com.jonatanbjerrekaer.countdown.remove_ads",
    tier: "standard",
  },
  {
    id: "com.jonatanbjerrekaer.countdown.remove_ads_supporter",
    tier: "supporter",
  },
] as const;

const PRODUCT_IDS = REMOVE_ADS_PRODUCTS.map((product) => product.id);

type PurchaseStore = {
  register: (...args: unknown[]) => unknown;
  ready: (...args: unknown[]) => unknown;
  when: (...args: unknown[]) => unknown;
  error: (...args: unknown[]) => unknown;
  refresh: (...args: unknown[]) => unknown;
  update: (
    successCb?: (...args: unknown[]) => void,
    errorCb?: (...args: unknown[]) => void,
    skipLoad?: boolean,
  ) => unknown;
  get: (...args: unknown[]) => unknown;
  order: (...args: unknown[]) => unknown;
};

const defaultProductDiagnostics = (): Record<string, CatalogProductDiagnostics> =>
  Object.fromEntries(
    PRODUCT_IDS.map((productId) => [
      productId,
      {
        state: "pending" as const,
        lastEvent: null,
        message: null,
        code: null,
        updatedAt: null,
      },
    ]),
  );

let isInitialized = false;
let listenersRegistered = false;
let storeKitTransactionListenerRegistered = false;
let productsRegistered = false;
let baseStateLoaded = false;
let isDevBuild = false;
let hasRemoveAdsEntitlement = false;
let baseInitPromise: Promise<void> | null = null;
let bootstrapPromise: Promise<void> | null = null;
let readyPromise: Promise<void> | null = null;
let readyResolve: (() => void) | null = null;
let storeReady = false;
let cordovaReady = false;
let pluginAvailable = false;
let bootstrapInProgress = false;
let bootstrapStartedAt: number | null = null;
let bootstrapCompletedAt: number | null = null;
let bootstrapError: string | null = null;
let initAttempts = 0;
const entitlementListeners = new Set<EntitlementListener>();
const catalogListeners = new Set<CatalogListener>();
const pendingCancelRejectors = new Map<string, (error: Error) => void>();
let testModeForceLoadFailure = false;
let lastSuccessfulProductLoadAt: number | null = null;
let lastLoadFailureReason: string | null = null;
let lastDiagnosticsSnapshot: StoreKitDiagnosticsSnapshot | null = null;
let lastDiagnosticsSnapshotAt: number | null = null;
let lastStoreErrorCode: number | null = null;
let lastStoreErrorMessage: string | null = null;
let catalogSource: CatalogSource = "storekit2";
let storeKitProductFetchError: string | null = null;
let lastSyncError: string | null = null;
let currentCatalogOperation: CatalogOperation = "passive";
let receiptLoadErrorIgnored = false;
let lastReceiptErrorCode: number | null = null;
let lastReceiptErrorMessage: string | null = null;
let catalogProductStates = defaultProductDiagnostics();
let catalogLoadToken = 0;
let catalogLoadPromise: Promise<CatalogLoadResult> | null = null;
let resolveCatalogLoad: ((result: CatalogLoadResult) => void) | null = null;
let catalogLoadTimeout: ReturnType<typeof setTimeout> | null = null;
let catalogSettleTimeout: ReturnType<typeof setTimeout> | null = null;
let catalogLoadStartedAt: number | null = null;
let catalogLoadCompletedAt: number | null = null;
let catalogRefreshInFlight = false;
let storeKitCatalogProducts: IAPProduct[] = [];
let catalogLoadResult: CatalogLoadResult = {
  status: "loading",
  products: [],
  unavailableProductIds: [...PRODUCT_IDS],
  errorCode: null,
  errorMessage: null,
  diagnostics: {
    storeReady: false,
    cordovaReady: false,
    pluginAvailable: false,
    bootstrapInProgress: false,
    bootstrapStartedAt: null,
    bootstrapCompletedAt: null,
    bootstrapError: null,
    initAttempts: 0,
    syncError: null,
    loadStartedAt: null,
    loadCompletedAt: null,
    lastSuccessfulProductLoadAt: null,
    lastLoadFailureReason: null,
    lastStoreErrorCode: null,
    lastStoreErrorMessage: null,
    catalogSource: "storekit2",
    storeKitProductFetchError: null,
    pricedProductIds: [],
    unpricedProductIds: [],
    hasUnpricedProducts: false,
    catalogOperation: "passive",
    receiptLoadErrorIgnored: false,
    lastReceiptErrorCode: null,
    lastReceiptErrorMessage: null,
    storeKitComparisonStatus: "unknown",
    storeKitComparisonMessage: null,
    productStates: defaultProductDiagnostics(),
    lastDiagnosticsSnapshotAt: null,
    hasDiagnosticsSnapshot: false,
    diagnosticsSnapshot: null,
  },
};

const getPurchaseStore = (): PurchaseStore | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const store = (window as Window & { store?: unknown }).store;
  if (!store || typeof store !== "object") {
    return null;
  }
  return store as PurchaseStore;
};

const hasPurchasePlugin = () => {
  const store = getPurchaseStore();
  if (!store) {
    return false;
  }
  return [
    "register",
    "ready",
    "when",
    "error",
    "refresh",
    "update",
    "get",
    "order",
  ].every((methodName) => typeof store[methodName as keyof PurchaseStore] === "function");
};

const notifyCatalogListeners = () => {
  catalogListeners.forEach((listener) => listener(catalogLoadResult));
};

const setCatalogLoadResult = (result: CatalogLoadResult) => {
  catalogLoadResult = result;
  notifyCatalogListeners();
};

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
  Boolean(productId && PRODUCT_IDS.includes(productId));

// Resolves true as soon as the remove-ads entitlement is set, false on
// timeout. Used where entitlement events may land after the triggering
// call returns (e.g. Cordova owned flags updating after a store refresh).
const waitForEntitlement = (timeoutMs: number): Promise<boolean> => {
  if (hasRemoveAdsEntitlement) return Promise.resolve(true);
  return new Promise((resolve) => {
    const listener: EntitlementListener = (entitled) => {
      if (entitled) {
        entitlementListeners.delete(listener);
        clearTimeout(timer);
        resolve(true);
      }
    };
    const timer = setTimeout(() => {
      entitlementListeners.delete(listener);
      resolve(false);
    }, timeoutMs);
    entitlementListeners.add(listener);
  });
};

const isIAPProduct = (value: unknown): value is IAPProduct =>
  Boolean(
    value &&
      typeof value === "object" &&
      "id" in value &&
      "state" in value &&
      "loaded" in value,
  );

const isIAPError = (value: unknown): value is IAPError =>
  Boolean(
    value &&
      typeof value === "object" &&
      "code" in value &&
      "message" in value,
  );

const collectDiagnosticsSnapshot = async (context: string): Promise<void> => {
  if (!Capacitor.isNativePlatform() || isDevBuild) {
    return;
  }
  try {
    const snapshot = await StoreKitDiagnostics.collectSnapshot();
    lastDiagnosticsSnapshot = snapshot;
    lastDiagnosticsSnapshotAt = Date.now();
    const refreshedResult = buildCatalogLoadResult(catalogLoadResult.status);
    console.log(`[Purchases] Diagnostics snapshot collected (${context}):`, snapshot);
    if (refreshedResult.diagnostics.storeKitComparisonMessage) {
      console.warn(
        `[Purchases] StoreKit comparison (${context}): ${refreshedResult.diagnostics.storeKitComparisonMessage}`,
      );
    }
    if (!catalogLoadPromise) {
      setCatalogLoadResult(refreshedResult);
    }
  } catch (error) {
    console.warn(
      `[Purchases] Failed to collect diagnostics snapshot (${context}):`,
      error,
    );
  }
};

const createReadyPromise = () => {
  if (readyPromise) {
    return;
  }
  readyPromise = new Promise<void>((resolve) => {
    readyResolve = resolve;
  });
};

const setBootstrapFailure = (error: unknown) => {
  bootstrapError = error instanceof Error ? error.message : String(error);
  bootstrapCompletedAt = Date.now();
  bootstrapInProgress = false;
  isInitialized = false;
  lastLoadFailureReason = bootstrapError;
  pluginAvailable = hasPurchasePlugin();
};

const waitForNativePurchasePrerequisites = async () => {
  pluginAvailable = hasPurchasePlugin();
  if (pluginAvailable) {
    cordovaReady = true;
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("CordovaDocumentUnavailable");
  }

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve();
    };

    const fail = (message: string) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(new Error(message));
    };

    const onDeviceReady = () => {
      cordovaReady = true;
      if (pluginAvailable) {
        finish();
      }
    };

    const pollForPlugin = () => {
      pluginAvailable = hasPurchasePlugin();
      if (pluginAvailable) {
        cordovaReady = true;
        finish();
      }
    };

    const cleanup = () => {
      document.removeEventListener("deviceready", onDeviceReady);
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };

    document.addEventListener("deviceready", onDeviceReady);

    const intervalId = setInterval(
      pollForPlugin,
      IAP_TIMING.bootstrapPollIntervalMs,
    );
    const timeoutId = setTimeout(() => {
      fail(cordovaReady ? "PurchasePluginUnavailable" : "CordovaReadyTimeout");
    }, IAP_TIMING.bootstrapTimeoutMs);

    pollForPlugin();
  });
};

const ensureBaseInit = async () => {
  if (baseStateLoaded) {
    return;
  }

  if (baseInitPromise) {
    return baseInitPromise;
  }

  baseInitPromise = (async () => {
    if (isDevBuild) {
      await Preferences.remove({ key: PREF_REMOVE_ADS });
      await Preferences.remove({ key: PREF_REMOVE_ADS_PRODUCT_ID });
    }

    await loadLocalEntitlement();
    entitlementListeners.forEach((listener) => listener(hasRemoveAdsEntitlement));
    baseStateLoaded = true;

    if (!Capacitor.isNativePlatform() || isDevBuild) {
      isInitialized = true;
    }
  })();

  try {
    await baseInitPromise;
  } finally {
    baseInitPromise = null;
  }
};

const ensureNativeBootstrap = async (options?: { force?: boolean }) => {
  await ensureBaseInit();

  if (!Capacitor.isNativePlatform() || isDevBuild) {
    isInitialized = true;
    return;
  }

  if (options?.force) {
    bootstrapPromise = null;
  }

  if (isInitialized && !bootstrapError && !options?.force) {
    pluginAvailable = hasPurchasePlugin();
    cordovaReady = cordovaReady || pluginAvailable;
    return;
  }

  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    initAttempts += 1;
    bootstrapStartedAt = Date.now();
    bootstrapCompletedAt = null;
    bootstrapError = null;
    bootstrapInProgress = true;
    pluginAvailable = hasPurchasePlugin();
    createReadyPromise();

    try {
      await waitForNativePurchasePrerequisites();

      if (!hasPurchasePlugin()) {
        throw new Error("PurchasePluginUnavailable");
      }

      InAppPurchase2.verbosity = InAppPurchase2.ERROR;

      if (!productsRegistered) {
        InAppPurchase2.register(
          REMOVE_ADS_PRODUCTS.map((product) => ({
            id: product.id,
            type: InAppPurchase2.NON_CONSUMABLE,
          })),
        );
        productsRegistered = true;
      }

      registerCatalogListeners();
      pluginAvailable = true;
      cordovaReady = true;
      bootstrapError = null;
      bootstrapCompletedAt = Date.now();
      bootstrapInProgress = false;
      isInitialized = true;
    } catch (error) {
      console.warn("[Purchases] Native bootstrap failed", error);
      setBootstrapFailure(error);
      throw error instanceof Error ? error : new Error(String(error));
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
};

const clearCatalogTimers = () => {
  if (catalogLoadTimeout) {
    clearTimeout(catalogLoadTimeout);
    catalogLoadTimeout = null;
  }
  if (catalogSettleTimeout) {
    clearTimeout(catalogSettleTimeout);
    catalogSettleTimeout = null;
  }
};

const createMockProduct = (
  product: (typeof REMOVE_ADS_PRODUCTS)[number],
): IAPProduct => ({
  id: product.id,
  alias: undefined,
  type: InAppPurchase2.NON_CONSUMABLE,
  state: InAppPurchase2.VALID,
  title: "Remove Ads",
  description:
    product.tier === "supporter"
      ? "Ad-free plus a thank you for supporting the app."
      : "Remove banners and interstitials.",
  priceMicros: product.tier === "supporter" ? 4990000 : 2990000,
  price: product.tier === "supporter" ? "EUR 4.99" : "EUR 2.99",
  currency: "EUR",
  loaded: true,
  valid: true,
  canPurchase: true,
  owned: false,
} as IAPProduct);

const createStoreKitCatalogProduct = (
  product: StoreKitFetchedProduct,
): IAPProduct => ({
  id: product.productId,
  alias: undefined,
  type: InAppPurchase2.NON_CONSUMABLE,
  state: product.available ? InAppPurchase2.VALID : InAppPurchase2.INVALID,
  title: product.displayName ?? "Remove Ads",
  description: product.description ?? "",
  priceMicros: undefined,
  price: product.price,
  currency: product.currencyCode,
  loaded: product.available,
  valid: product.available,
  canPurchase: product.available,
  owned: hasRemoveAdsEntitlement,
} as IAPProduct);

const getCatalogProductState = (product: IAPProduct): CatalogProductState => {
  if (product.loaded && product.valid && product.price) {
    return "loaded_priced";
  }
  if (product.loaded && product.valid) {
    return "loaded_no_price";
  }
  if (product.loaded && !product.valid) {
    return "invalid";
  }
  return "pending";
};

const getCatalogProductMessage = (product: IAPProduct): string | null => {
  const state = getCatalogProductState(product);
  if (state === "loaded_no_price") {
    return "Product loaded without price";
  }
  if (state === "invalid") {
    return "Product marked invalid by StoreKit";
  }
  return null;
};

const getPluginProducts = (): IAPProduct[] => {
  if (!isDevBuild && !hasPurchasePlugin()) {
    return [];
  }

  return PRODUCT_IDS.map((productId) => InAppPurchase2.get(productId)).filter(
    (product): product is IAPProduct => Boolean(product),
  );
};

const getCatalogProductsForSource = (): IAPProduct[] =>
  catalogSource === "storekit2" ? storeKitCatalogProducts : getPluginProducts();

const getPricedProducts = (): IAPProduct[] =>
  getCatalogProductsForSource().filter(
    (product) => getCatalogProductState(product) === "loaded_priced",
  );

const getUnpricedProductIds = (): string[] =>
  PRODUCT_IDS.filter((productId) => {
    const product = getCatalogProductsForSource().find((item) => item.id === productId);
    return Boolean(
      product &&
        getCatalogProductState(product as IAPProduct) === "loaded_no_price",
    );
  });

const getStoreKitComparison = (
  pricedProductIds: string[],
  unpricedProductIds: string[],
): {
  status: StoreKitComparisonStatus;
  message: string | null;
} => {
  const productStatuses = lastDiagnosticsSnapshot?.productStatuses ?? [];
  if (productStatuses.length === 0) {
    return {
      status: "unknown",
      message: null,
    };
  }

  const storeKitPricedProductIds = PRODUCT_IDS.filter((productId) => {
    const status = productStatuses.find((item) => item.productId === productId);
    return Boolean(status?.available && status.price);
  });
  const storeKitUnpricedProductIds = PRODUCT_IDS.filter((productId) => {
    const status = productStatuses.find((item) => item.productId === productId);
    return Boolean(status?.available && !status.price);
  });

  if (storeKitPricedProductIds.some((productId) => !pricedProductIds.includes(productId))) {
    return {
      status: "wrapper_plugin_hydration_failure",
      message:
        "StoreKit returned priced products, but the Cordova purchase wrapper did not expose them.",
    };
  }

  const storeKitMissingProducts = productStatuses.some(
    (status) => !status.available || Boolean(status.error),
  );
  if (
    pricedProductIds.length === 0 &&
    (unpricedProductIds.length > 0 ||
      storeKitUnpricedProductIds.length > 0 ||
      storeKitMissingProducts)
  ) {
    return {
      status: "app_store_or_sandbox_missing_prices",
      message:
        storeKitUnpricedProductIds.length > 0 || unpricedProductIds.length > 0
          ? "Products were discovered without prices. Check App Store Connect state and sandbox readiness."
          : "StoreKit could not load the configured products or prices. Check App Store Connect state and sandbox readiness.",
    };
  }

  return {
    status: "aligned",
    message: null,
  };
};

const getDiagnosticsSnapshotSummary = () =>
  lastDiagnosticsSnapshot
    ? {
        timestamp: lastDiagnosticsSnapshot.timestamp,
        productStatuses: lastDiagnosticsSnapshot.productStatuses,
        entitlementsCount: lastDiagnosticsSnapshot.currentEntitlements?.length ?? 0,
        transactionsCount: lastDiagnosticsSnapshot.transactionCount ?? 0,
      }
    : null;

const buildCatalogLoadResult = (
  statusOverride?: CatalogStatus,
): CatalogLoadResult => {
  const products = isDevBuild
    ? REMOVE_ADS_PRODUCTS.map((product) => createMockProduct(product))
    : getPricedProducts();
  const pricedProductIds = products.map((product) => product.id);
  const unpricedProductIds = isDevBuild ? [] : getUnpricedProductIds();
  const storeKitComparison = isDevBuild
    ? { status: "aligned" as const, message: null }
    : getStoreKitComparison(pricedProductIds, unpricedProductIds);

  const unavailableProductIds = isDevBuild
    ? []
    : PRODUCT_IDS.filter((productId) => !pricedProductIds.includes(productId));

  const status =
    statusOverride ??
    (products.length === PRODUCT_IDS.length
      ? "loaded"
      : products.length > 0
        ? "partial"
        : "unavailable");

  return {
    status,
    products,
    unavailableProductIds,
    errorCode: lastStoreErrorCode,
    errorMessage:
      bootstrapError ??
      storeKitProductFetchError ??
      lastStoreErrorMessage ??
      lastSyncError ??
      lastLoadFailureReason,
    diagnostics: {
      storeReady,
      cordovaReady,
      pluginAvailable,
      bootstrapInProgress,
      bootstrapStartedAt,
      bootstrapCompletedAt,
      bootstrapError,
      initAttempts,
      syncError: lastSyncError,
      loadStartedAt: catalogLoadStartedAt,
      loadCompletedAt: catalogLoadCompletedAt,
      lastSuccessfulProductLoadAt,
      lastLoadFailureReason,
      lastStoreErrorCode,
      lastStoreErrorMessage,
      catalogSource,
      storeKitProductFetchError,
      pricedProductIds,
      unpricedProductIds,
      hasUnpricedProducts: unpricedProductIds.length > 0,
      catalogOperation: currentCatalogOperation,
      receiptLoadErrorIgnored,
      lastReceiptErrorCode,
      lastReceiptErrorMessage,
      storeKitComparisonStatus: storeKitComparison.status,
      storeKitComparisonMessage: storeKitComparison.message,
      productStates: { ...catalogProductStates },
      lastDiagnosticsSnapshotAt,
      hasDiagnosticsSnapshot: lastDiagnosticsSnapshot !== null,
      diagnosticsSnapshot: getDiagnosticsSnapshotSummary(),
    },
  };
};

const updateProductDiagnostics = (
  productId: string,
  state: CatalogProductState,
  eventName: string,
  message: string | null = null,
  code: number | null = null,
) => {
  if (!isRemoveAdsProduct(productId)) {
    return;
  }
  catalogProductStates = {
    ...catalogProductStates,
    [productId]: {
      state,
      lastEvent: eventName,
      message,
      code,
      updatedAt: Date.now(),
    },
  };
};

const syncProductDiagnosticsFromStoreKitFetch = (
  result: StoreKitProductFetchResult,
) => {
  result.products.forEach((product) => {
    const catalogProduct = createStoreKitCatalogProduct(product);
    updateProductDiagnostics(
      product.productId,
      getCatalogProductState(catalogProduct),
      "storekit-fetch",
      product.error ?? getCatalogProductMessage(catalogProduct),
    );
  });
};

const syncProductDiagnosticsFromStore = () => {
  if (!hasPurchasePlugin()) {
    return;
  }
  PRODUCT_IDS.forEach((productId) => {
    const product = InAppPurchase2.get(productId);
    if (!product) {
      return;
    }
    const state = getCatalogProductState(product as IAPProduct);
    if (state !== "pending") {
      updateProductDiagnostics(
        productId,
        state,
        "store-snapshot",
        getCatalogProductMessage(product as IAPProduct),
      );
    }
  });
};

const resolveReady = () => {
  storeReady = true;
  if (readyResolve) {
    readyResolve();
    readyResolve = null;
  }
};

const ensureStoreReady = async () => {
  if (!readyPromise) {
    return;
  }
  try {
    await Promise.race([
      readyPromise,
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("StoreReadyTimeout")), IAP_TIMING.storeReadyTimeoutMs),
      ),
    ]);
  } catch {
    return;
  }
};

const isPassiveReceiptError = (code: number | null, message: string | null) => {
  const normalized = message?.toLowerCase() ?? "";
  return (
    code === InAppPurchase2.ERR_LOAD_RECEIPTS ||
    code === InAppPurchase2.ERR_REFRESH_RECEIPTS ||
    normalized.includes("no appstorereceipt") ||
    normalized.includes("failed to load receipt")
  );
};

const recordPassiveReceiptError = (code: number | null, message: string | null) => {
  receiptLoadErrorIgnored = true;
  lastReceiptErrorCode = code;
  lastReceiptErrorMessage = message;
};

const fetchCatalogFromStoreKit = async () => {
  // Product.products(for:) can fail transiently (network, slow sandbox
  // readiness, esp. iPad) — retry with backoff within the catalog stall
  // timeout instead of surfacing an empty paywall on the first miss.
  let result = await StoreKitDiagnostics.fetchProducts();
  for (
    let attempt = 1;
    attempt < IAP_TIMING.productFetchMaxAttempts &&
    (result.error || !result.products.some((product) => product.available)) &&
    result.error !== "StoreKit 2 requires iOS 15.0+";
    attempt += 1
  ) {
    await new Promise((resolve) =>
      setTimeout(resolve, IAP_TIMING.productFetchRetryBaseDelayMs * attempt),
    );
    result = await StoreKitDiagnostics.fetchProducts();
  }
  catalogSource = "storekit2";
  storeKitProductFetchError = result.error ?? null;
  storeKitCatalogProducts = result.products
    .filter((product) => product.available)
    .map((product) => createStoreKitCatalogProduct(product));
  syncProductDiagnosticsFromStoreKitFetch(result);

  if (result.error) {
    lastLoadFailureReason = result.error;
  } else if (storeKitCatalogProducts.length === 0) {
    lastLoadFailureReason = "StoreKit did not return any priced products";
  }
};

const refreshStoreForRestore = async () => {
  const refreshResult = InAppPurchase2.refresh();
  await Promise.race([
    new Promise<void>((resolve, reject) => {
      refreshResult.completed(() => resolve());
      refreshResult.finished(() => resolve());
      refreshResult.cancelled(() => resolve());
      refreshResult.failed(() => reject(new Error("Store refresh failed")));
    }),
    new Promise<void>((_, reject) =>
      setTimeout(
        () => reject(new Error("StoreRefreshTimeout")),
        IAP_TIMING.catalogStallTimeoutMs,
      ),
    ),
  ]);
};

const completeCatalogLoad = (statusOverride?: CatalogStatus, context = "load-complete") => {
  clearCatalogTimers();
  catalogRefreshInFlight = false;
  catalogLoadCompletedAt = Date.now();
  if (catalogSource === "cordova-plugin") {
    syncProductDiagnosticsFromStore();
  }

  if (testModeForceLoadFailure && !isDevBuild) {
    lastLoadFailureReason = "Test mode forced catalog load failure";
  }

  const result = buildCatalogLoadResult(statusOverride);

  if (result.products.length > 0) {
    lastSuccessfulProductLoadAt = Date.now();
    if (result.status === "loaded") {
      lastLoadFailureReason = null;
      lastStoreErrorCode = null;
      lastStoreErrorMessage = null;
      lastSyncError = null;
    } else {
      lastLoadFailureReason = `Only ${result.products.length}/${PRODUCT_IDS.length} offers loaded`;
    }
  } else if (storeKitProductFetchError) {
    lastLoadFailureReason = storeKitProductFetchError;
  } else if (receiptLoadErrorIgnored && lastReceiptErrorMessage) {
    lastLoadFailureReason =
      currentCatalogOperation === "passive"
        ? "Passive paywall load could not access a local App Store receipt"
        : lastReceiptErrorMessage;
  } else if (result.diagnostics.hasUnpricedProducts) {
    lastLoadFailureReason = "Products were discovered without prices";
  } else if (!lastLoadFailureReason) {
    lastLoadFailureReason =
      result.diagnostics.storeKitComparisonMessage ??
      result.errorMessage ??
      `Unable to load ${PRODUCT_IDS.length} configured products`;
  }

  const finalResult = buildCatalogLoadResult(statusOverride);
  setCatalogLoadResult(finalResult);

  if (resolveCatalogLoad) {
    resolveCatalogLoad(finalResult);
  }
  resolveCatalogLoad = null;
  catalogLoadPromise = null;

  void collectDiagnosticsSnapshot(
    `${context}-${finalResult.status === "loaded" ? "success" : finalResult.status}`,
  );
};

const queueCatalogSettle = (loadToken: number, reason: string) => {
  if (!catalogLoadPromise || loadToken !== catalogLoadToken) {
    return;
  }
  if (catalogSettleTimeout) {
    clearTimeout(catalogSettleTimeout);
  }
  catalogSettleTimeout = setTimeout(() => {
    if (loadToken !== catalogLoadToken || !catalogLoadPromise) {
      return;
    }
    if (catalogSource === "cordova-plugin") {
      syncProductDiagnosticsFromStore();
    }
    const resolvedCount = Object.values(catalogProductStates).filter(
      (snapshot) => snapshot.state !== "pending",
    ).length;
    const hasCatalogSignal =
      catalogSource === "storekit2" ||
      storeReady ||
      getPricedProducts().length > 0 ||
      Object.values(catalogProductStates).some((snapshot) => snapshot.state !== "pending") ||
      Boolean(lastStoreErrorMessage);

    if (resolvedCount === PRODUCT_IDS.length) {
      completeCatalogLoad(undefined, reason);
      return;
    }

    if (!catalogRefreshInFlight && hasCatalogSignal) {
      completeCatalogLoad(undefined, reason);
    }
  }, IAP_TIMING.catalogSettleDebounceMs);
};

const resetCatalogDiagnostics = () => {
  lastStoreErrorCode = null;
  lastStoreErrorMessage = null;
  storeKitProductFetchError = null;
  lastSyncError = null;
  receiptLoadErrorIgnored = false;
  lastReceiptErrorCode = null;
  lastReceiptErrorMessage = null;
  lastLoadFailureReason = null;
  catalogSource = "storekit2";
  storeKitCatalogProducts = [];
  catalogProductStates = defaultProductDiagnostics();
};

const registerCatalogListeners = () => {
  if (listenersRegistered || !Capacitor.isNativePlatform()) {
    return;
  }

  listenersRegistered = true;
  createReadyPromise();

  InAppPurchase2.ready(() => {
    resolveReady();
    queueCatalogSettle(catalogLoadToken, "store-ready");
  });

  InAppPurchase2.error((errorPayload: unknown) => {
    if (isIAPError(errorPayload)) {
      if (
        currentCatalogOperation === "passive" &&
        isPassiveReceiptError(errorPayload.code, errorPayload.message)
      ) {
        recordPassiveReceiptError(errorPayload.code, errorPayload.message);
        console.warn("[Purchases] Passive receipt error ignored", errorPayload);
        queueCatalogSettle(catalogLoadToken, "passive-receipt-error");
        return;
      }
      lastStoreErrorCode = errorPayload.code;
      lastStoreErrorMessage = errorPayload.message;
      lastLoadFailureReason = errorPayload.message;
      console.warn("[Purchases] Store error", errorPayload);
      queueCatalogSettle(catalogLoadToken, "store-error");
    }
  });

  PRODUCT_IDS.forEach((productId) => {
    const events = InAppPurchase2.when(productId);

    events.loaded((payload: unknown) => {
      if (!isIAPProduct(payload)) {
        return;
      }
      updateProductDiagnostics(
        productId,
        getCatalogProductState(payload),
        "loaded",
        getCatalogProductMessage(payload),
      );
      queueCatalogSettle(catalogLoadToken, "product-loaded");
    });

    events.updated((payload: unknown) => {
      if (!isIAPProduct(payload)) {
        return;
      }
      updateProductDiagnostics(
        productId,
        getCatalogProductState(payload),
        "updated",
        getCatalogProductMessage(payload),
      );
      queueCatalogSettle(catalogLoadToken, "product-updated");
    });

    events.valid((payload: unknown) => {
      if (!isIAPProduct(payload)) {
        return;
      }
      updateProductDiagnostics(
        productId,
        getCatalogProductState(payload),
        "valid",
        getCatalogProductMessage(payload),
      );
      queueCatalogSettle(catalogLoadToken, "product-valid");
    });

    events.invalid((payload: unknown) => {
      if (!isIAPProduct(payload)) {
        return;
      }
      updateProductDiagnostics(
        productId,
        "invalid",
        "invalid",
        "Product unavailable from App Store",
      );
      queueCatalogSettle(catalogLoadToken, "product-invalid");
    });

    events.error((payload: unknown) => {
      if (!isIAPError(payload)) {
        return;
      }
      updateProductDiagnostics(
        productId,
        "error",
        "error",
        payload.message,
        payload.code,
      );
      lastStoreErrorCode = payload.code;
      lastStoreErrorMessage = payload.message;
      lastLoadFailureReason = payload.message;
      queueCatalogSettle(catalogLoadToken, "product-error");
    });

    events.approved((payload: unknown) => {
      if (!isIAPProduct(payload) || !isRemoveAdsProduct(payload.id)) {
        return;
      }
      void setEntitlement(true, !isDevBuild, payload.id);
      payload.finish();
    });

    events.owned((payload: unknown) => {
      if (!isIAPProduct(payload) || !isRemoveAdsProduct(payload.id)) {
        return;
      }
      void setEntitlement(true, !isDevBuild, payload.id);
    });

    events.refunded((payload: unknown) => {
      if (!isIAPProduct(payload) || !isRemoveAdsProduct(payload.id)) {
        return;
      }
      void setEntitlement(false);
    });

    events.cancelled((payload: unknown) => {
      if (!isIAPProduct(payload) || !isRemoveAdsProduct(payload.id)) {
        return;
      }
      const rejectPending = pendingCancelRejectors.get(payload.id);
      if (rejectPending) {
        rejectPending(new Error("PaymentCancelled"));
        pendingCancelRejectors.delete(payload.id);
      }
    });
  });
};

const cancelActiveCatalogLoad = () => {
  if (!catalogLoadPromise || !resolveCatalogLoad) {
    clearCatalogTimers();
    return;
  }
  clearCatalogTimers();
  resolveCatalogLoad(buildCatalogLoadResult());
  resolveCatalogLoad = null;
  catalogLoadPromise = null;
};

export const PurchasesManager = {
  init: async () => {
    await ensureBaseInit();

    if (!Capacitor.isNativePlatform()) {
      return;
    }

    if (!storeKitTransactionListenerRegistered) {
      storeKitTransactionListenerRegistered = true;
      // StoreKit 2 transaction updates from the native plugin — covers
      // purchases/restores where the Cordova payment-queue events never fire.
      void StoreKitDiagnostics.addListener("transactionUpdated", (data) => {
        if (isRemoveAdsProduct(data.productId) && !data.revocationDate) {
          void setEntitlement(true, true, data.productId);
        }
      });
    }

    if (isDevBuild) {
      resetCatalogDiagnostics();
      setCatalogLoadResult(buildCatalogLoadResult("loaded"));
    }
  },

  setDevBuild: (isDev: boolean) => {
    const wasInitialized = isInitialized;
    isDevBuild = isDev;
    bootstrapPromise = null;
    if (isDevBuild) {
      cancelActiveCatalogLoad();
      resetCatalogDiagnostics();
      bootstrapInProgress = false;
      bootstrapError = null;
      bootstrapCompletedAt = Date.now();
      bootstrapStartedAt = bootstrapStartedAt ?? bootstrapCompletedAt;
      isInitialized = true;
      setCatalogLoadResult(buildCatalogLoadResult("loaded"));
      return;
    }
    isInitialized = false;
    bootstrapInProgress = false;
    bootstrapError = null;
    bootstrapStartedAt = null;
    bootstrapCompletedAt = null;
    storeReady = false;
    if (wasInitialized && Capacitor.isNativePlatform()) {
      void PurchasesManager.loadCatalog({
        reason: "dev-build-disabled",
        force: true,
        operation: "passive",
      });
    }
  },

  loadCatalog: async ({
    reason = "catalog-load",
    force = false,
    operation = "passive",
  }: CatalogLoadOptions = {}): Promise<CatalogLoadResult> => {
    await PurchasesManager.init();

    if (!Capacitor.isNativePlatform()) {
      return buildCatalogLoadResult("unavailable");
    }

    if (isDevBuild) {
      const result = buildCatalogLoadResult("loaded");
      setCatalogLoadResult(result);
      return result;
    }

    if (catalogLoadPromise && !force) {
      return catalogLoadPromise;
    }

    if (force) {
      cancelActiveCatalogLoad();
    }

    resetCatalogDiagnostics();
    catalogLoadStartedAt = Date.now();
    catalogLoadCompletedAt = null;
    currentCatalogOperation = operation;

    setCatalogLoadResult(buildCatalogLoadResult("loading"));

    catalogLoadToken += 1;
    const loadToken = catalogLoadToken;
    catalogRefreshInFlight = true;

    catalogLoadPromise = new Promise<CatalogLoadResult>((resolve) => {
      resolveCatalogLoad = resolve;
    });

    catalogLoadTimeout = setTimeout(() => {
      if (loadToken !== catalogLoadToken || !catalogLoadPromise) {
        return;
      }
      PRODUCT_IDS.forEach((productId) => {
        const snapshot = catalogProductStates[productId];
        if (snapshot.state === "pending") {
          updateProductDiagnostics(
            productId,
            "error",
            "timeout",
            "Product did not resolve before timeout",
          );
        }
      });
      lastLoadFailureReason =
        storeKitProductFetchError ??
        (receiptLoadErrorIgnored && lastReceiptErrorMessage
          ? "Passive paywall load could not access a local App Store receipt"
          : "Catalog load timed out");
      completeCatalogLoad(undefined, "catalog-timeout");
    }, IAP_TIMING.catalogStallTimeoutMs);

    const runLoad = async () => {
      catalogSource = operation === "restore" ? "cordova-plugin" : "storekit2";

      if (operation === "restore") {
        await ensureNativeBootstrap({
          force: force || bootstrapError !== null,
        }).catch(() => {
          catalogLoadCompletedAt = Date.now();
          const result = buildCatalogLoadResult("unavailable");
          setCatalogLoadResult(result);
          return undefined;
        });

        if (!isInitialized) {
          completeCatalogLoad("unavailable", `${reason}-bootstrap-failed`);
          return;
        }

        try {
          const syncResult = await StoreKitDiagnostics.syncStore();
          if (!syncResult.success) {
            lastSyncError = syncResult.error ?? "App Store sync failed";
          }
        } catch (error) {
          lastSyncError = error instanceof Error ? error.message : String(error);
        }
      }

      if (loadToken !== catalogLoadToken || !catalogLoadPromise) {
        return;
      }

      if (testModeForceLoadFailure) {
        PRODUCT_IDS.forEach((productId) => {
          updateProductDiagnostics(
            productId,
            "error",
            "test-mode",
            "Test mode forced catalog load failure",
          );
        });
        lastStoreErrorMessage = "Test mode forced catalog load failure";
        lastLoadFailureReason = lastStoreErrorMessage;
        completeCatalogLoad("unavailable", `${reason}-test-mode`);
        return;
      }

      try {
        if (operation === "restore") {
          await refreshStoreForRestore();
        } else {
          await fetchCatalogFromStoreKit();
        }
      } catch (error) {
        const failureMessage =
          error instanceof Error ? error.message : String(error);
        if (operation === "restore") {
          lastStoreErrorMessage = failureMessage;
        } else {
          storeKitProductFetchError = failureMessage;
        }
        lastLoadFailureReason = failureMessage;
      } finally {
        if (loadToken === catalogLoadToken && catalogLoadPromise) {
          catalogRefreshInFlight = false;
          queueCatalogSettle(loadToken, `${reason}-${operation}`);
        }
      }
    };

    void runLoad();

    return catalogLoadPromise;
  },

  prefetchProducts: async (): Promise<IAPProduct[]> => {
    const result = await PurchasesManager.loadCatalog({
      reason: "prefetch",
      operation: "passive",
    });
    return result.products;
  },

  getProducts: async (): Promise<IAPProduct[]> => {
    if (!Capacitor.isNativePlatform()) {
      return [];
    }
    if (isDevBuild) {
      return REMOVE_ADS_PRODUCTS.map((product) => createMockProduct(product));
    }
    const result = await PurchasesManager.loadCatalog({
      reason: "get-products",
      operation: "passive",
    });
    return result.products;
  },

  purchaseRemoveAds: async (productId: string) => {
    await PurchasesManager.init();
    if (!Capacitor.isNativePlatform()) {
      throw new Error("Purchases are not available on web.");
    }

    const catalog = await PurchasesManager.loadCatalog({
      reason: "purchase",
      operation: "passive",
    });
    const product = catalog.products.find((item) => item.id === productId);

    if (!product) {
      throw new Error("ProductUnavailable");
    }

    await ensureNativeBootstrap({
      force: bootstrapError !== null,
    });
    await ensureStoreReady();

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
      const orderResultPromise = new Promise<void>((resolve, reject) => {
        orderResult.then(() => resolve());
        orderResult.error((err: unknown) => reject(err));
      });

      // Race orderResult, entitlement (approved event may resolve it first), and timeout.
      // On some iOS/iPadOS versions orderResult.then() never fires after sandbox approval,
      // causing an indefinite hang — entitlementPromise and the timeout provide the escape.
      await Promise.race([
        orderResultPromise,
        entitlementPromise,
        new Promise<void>((_, reject) =>
          setTimeout(
            () => reject(new Error("EntitlementTimeout")),
            IAP_TIMING.purchaseEntitlementTimeoutMs,
          ),
        ),
      ]);

      const orderedProduct = InAppPurchase2.get(productId);
      if (orderedProduct?.owned || hasRemoveAdsEntitlement) {
        removeListener();
        if (entitlementResolve) {
          entitlementResolve();
        }
        void collectDiagnosticsSnapshot("purchase-success");
        return;
      }

      // orderResult.then() fired but entitlement not yet propagated — wait for it.
      await Promise.race([
        entitlementPromise,
        new Promise<void>((_, reject) =>
          setTimeout(
            () => reject(new Error("EntitlementTimeout")),
            IAP_TIMING.purchaseEntitlementTimeoutMs,
          ),
        ),
      ]);

      removeListener();
      void collectDiagnosticsSnapshot("purchase-success");
      return;
    } catch (error) {
      pendingCancelRejectors.delete(productId);
      removeListener();
      void collectDiagnosticsSnapshot("purchase-failure");
      throw error;
    } finally {
      pendingCancelRejectors.delete(productId);
    }
  },

  restorePurchases: async (): Promise<boolean> => {
    await PurchasesManager.init();
    if (!Capacitor.isNativePlatform()) return false;
    try {
      await PurchasesManager.loadCatalog({
        reason: "restore",
        force: true,
        operation: "restore",
      });

      // Primary signal: StoreKit 2 current entitlements, fresh after the
      // AppStore.sync() performed by the restore catalog load above.
      try {
        const { entitlements } = await StoreKitDiagnostics.getEntitlements();
        const entitled = entitlements.find(
          (entitlement) =>
            !entitlement.verificationFailed &&
            !entitlement.revocationDate &&
            isRemoveAdsProduct(entitlement.productId),
        );
        if (entitled) {
          await setEntitlement(true, true, entitled.productId);
          void collectDiagnosticsSnapshot("restore-success");
          return true;
        }
      } catch {
        // Fall through to the Cordova-plugin signals below.
      }

      // Fallback: Cordova plugin owned flags. These update asynchronously
      // after the store refresh, so wait for the entitlement listener
      // instead of only sampling them immediately.
      const ownedProducts = PRODUCT_IDS.filter((productId) => {
        const product = InAppPurchase2.get(productId);
        return product?.owned === true;
      });

      const restored =
        hasRemoveAdsEntitlement ||
        ownedProducts.length > 0 ||
        (await waitForEntitlement(IAP_TIMING.restoreEntitlementWaitMs));
      void collectDiagnosticsSnapshot(
        `restore-${restored ? "success" : "none-found"}`,
      );
      return restored;
    } catch (error) {
      void collectDiagnosticsSnapshot("restore-failure");
      throw error;
    }
  },

  setDevEntitlement: async (value: boolean, productId?: string) => {
    await setEntitlement(value, true, productId);
  },

  setTestMode: (options: { forceLoadFailure: boolean }) => {
    if (process.env.NODE_ENV === "production") return;
    testModeForceLoadFailure = options.forceLoadFailure;
    console.log(
      `[Purchases] Test mode: forceLoadFailure=${testModeForceLoadFailure}`,
    );
  },

  getTestMode: () => ({
    forceLoadFailure: testModeForceLoadFailure,
  }),

  getCatalogLoadResult: () => catalogLoadResult,

  onCatalogChange: (listener: CatalogListener) => {
    catalogListeners.add(listener);
    listener(catalogLoadResult);
    return () => catalogListeners.delete(listener);
  },

  getDiagnostics: () => ({
    lastSuccessfulProductLoadAt,
    lastLoadFailureReason,
    storeReady,
    cordovaReady,
    pluginAvailable,
    bootstrapInProgress,
    bootstrapStartedAt,
    bootstrapCompletedAt,
    bootstrapError,
    initAttempts,
    lastStoreErrorCode,
    lastStoreErrorMessage,
    catalogSource: catalogLoadResult.diagnostics.catalogSource,
    storeKitProductFetchError: catalogLoadResult.diagnostics.storeKitProductFetchError,
    lastSyncError,
    catalogOperation: catalogLoadResult.diagnostics.catalogOperation,
    receiptLoadErrorIgnored: catalogLoadResult.diagnostics.receiptLoadErrorIgnored,
    lastReceiptErrorCode: catalogLoadResult.diagnostics.lastReceiptErrorCode,
    lastReceiptErrorMessage: catalogLoadResult.diagnostics.lastReceiptErrorMessage,
    pricedProductIds: catalogLoadResult.diagnostics.pricedProductIds,
    unpricedProductIds: catalogLoadResult.diagnostics.unpricedProductIds,
    hasUnpricedProducts: catalogLoadResult.diagnostics.hasUnpricedProducts,
    storeKitComparisonStatus: catalogLoadResult.diagnostics.storeKitComparisonStatus,
    storeKitComparisonMessage: catalogLoadResult.diagnostics.storeKitComparisonMessage,
    catalogStatus: catalogLoadResult.status,
    unavailableProductIds: catalogLoadResult.unavailableProductIds,
    productStates: catalogProductStates,
    lastDiagnosticsSnapshotAt,
    hasDiagnosticsSnapshot: lastDiagnosticsSnapshot !== null,
    diagnosticsSnapshot: getDiagnosticsSnapshotSummary(),
  }),

  hasRemoveAdsEntitlement: () => hasRemoveAdsEntitlement,
  getRemoveAdsProducts: () => [...REMOVE_ADS_PRODUCTS],

  // Apply a remove-ads entitlement mirrored from another device via iCloud.
  // Only ever grants (never revokes) — "remove ads" is a permanent
  // non-consumable purchase, and a device where StoreKit can't reach the App
  // Store (e.g. iOS-app-on-Mac) relies on this to go ad-free. StoreKit remains
  // authoritative on devices where it works.
  applyRemoteEntitlement: async (value: boolean) => {
    if (value && !hasRemoveAdsEntitlement) {
      await setEntitlement(true);
    }
  },

  isStoreReady: async () => {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }
    if (isDevBuild) {
      return true;
    }
    await PurchasesManager.init();
    await ensureNativeBootstrap({
      force: bootstrapError !== null,
    }).catch(() => undefined);
    await ensureStoreReady();
    return storeReady;
  },

  onEntitlementChange: (listener: EntitlementListener) => {
    entitlementListeners.add(listener);
    listener(hasRemoveAdsEntitlement);
    return () => entitlementListeners.delete(listener);
  },
};
