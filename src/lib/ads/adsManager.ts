import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { PurchasesManager } from "@/lib/purchases/purchasesManager";
import {
  AdMob,
  AdmobConsentStatus,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  InterstitialAdPluginEvents,
} from "@capacitor-community/admob";

type SaveKind = "create" | "edit" | "delete";

const BANNER_AD_ID = "ca-app-pub-2483551077156189/1520554438";
const INTERSTITIAL_AD_ID = "ca-app-pub-2483551077156189/3401430555";
const IS_DEV_BUILD_FALLBACK = import.meta.env.MODE !== "production";
let isDevBuildRuntime = IS_DEV_BUILD_FALLBACK;
let allowPersonalizedAds = false;


const PREF_HAS_CREATED_ONCE = "ads_hasCreatedOnce";
const PREF_HAS_EDITED_ONCE = "ads_hasEditedOnce";
const PREF_HAS_DELETED_ONCE = "ads_hasDeletedOnce";
const PREF_LAST_INTERSTITIAL_AT = "ads_lastInterstitialAt";
const PREF_SAVE_COUNT_SINCE_INTERSTITIAL = "ads_saveCountSinceLastInterstitial";
const PREF_DEV_ADS_ENABLED = "ads_devEnabled";

let isInitialized = false;
let bannerVisible = false;
let interstitialReady = false;
let interstitialLoading = false;
let interstitialLoadPromise: Promise<void> | null = null;
let interstitialLoadResolve: (() => void) | null = null;
let interstitialLoadReject: ((error: Error) => void) | null = null;
let bannerStatus: "hidden" | "visible" | "failed" = "hidden";
const bannerStatusListeners = new Set<
  (status: "hidden" | "visible" | "failed") => void
>();
type TrackingStatus = "authorized" | "denied" | "notDetermined" | "restricted" | "unknown";
type ConsentStatus =
  | "NOT_REQUIRED"
  | "OBTAINED"
  | "REQUIRED"
  | "UNKNOWN";

const debugInfo = {
  init: "not-started",
  consentStatus: "UNKNOWN" as ConsentStatus,
  consentFormAvailable: false,
  trackingStatus: "unknown" as TrackingStatus,
  bannerStatus: "hidden" as "hidden" | "visible" | "failed",
  lastBannerError: "",
  lastBannerRequestAt: "",
  lastBannerShowAt: "",
};
const debugInfoListeners = new Set<(info: typeof debugInfo) => void>();

const setBannerHeight = (height: number) => {
  if (typeof document === "undefined") return;
  const safeHeight = Number.isFinite(height) ? height : 0;
  
  // Always update the property if it's non-zero
  // or if we are hidden (to reset it)
  document.documentElement.style.setProperty(
    "--ad-banner-height",
    `${Math.max(0, Math.round(safeHeight))}px`,
  );
};

const notifyBannerStatus = (status: "hidden" | "visible" | "failed") => {
  bannerStatus = status;
  debugInfo.bannerStatus = status;
  bannerStatusListeners.forEach((listener) => listener(status));
  debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
};

const getBool = async (key: string) => {
  const { value } = await Preferences.get({ key });
  return value === "true";
};

const getNumber = async (key: string) => {
  const { value } = await Preferences.get({ key });
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const setBool = async (key: string, value: boolean) => {
  await Preferences.set({ key, value: value ? "true" : "false" });
};

const setNumber = async (key: string, value: number) => {
  await Preferences.set({ key, value: String(Math.floor(value)) });
};

const getDevAdsEnabled = async () => {
  const { value } = await Preferences.get({ key: PREF_DEV_ADS_ENABLED });
  if (value === null) {
    await Preferences.set({ key: PREF_DEV_ADS_ENABLED, value: "false" });
    return false;
  }
  return value === "true";
};

const setDevAdsEnabled = async (enabled: boolean) => {
  await Preferences.set({
    key: PREF_DEV_ADS_ENABLED,
    value: enabled ? "true" : "false",
  });
};

const isAdsEnabled = async () => {
  await PurchasesManager.init();
  if (PurchasesManager.hasRemoveAdsEntitlement()) return false;
  if (!isDevBuildRuntime) return true;
  const enabled = await getDevAdsEnabled();
  return enabled;
};

const getIsTestingAds = async () => {
  if (!isDevBuildRuntime) return false;
  const enabled = await getDevAdsEnabled();
  return enabled;
};

const PREPARE_TIMEOUT_MS = 30_000; // 30 seconds timeout
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE_MS = 5_000; // 5 seconds base delay

const INIT_MAX_RETRY_ATTEMPTS = 3;
const INIT_RETRY_DELAY_BASE_MS = 2_000; // 2 seconds base delay

let lastPrepareError: Error | null = null;
let initPromise: Promise<void> | null = null;

const prepareInterstitial = async (retryCount = 0): Promise<void> => {
  if (interstitialLoadPromise) return interstitialLoadPromise;
  if (interstitialReady) return Promise.resolve();

  interstitialLoading = true;

  interstitialLoadPromise = new Promise<void>((resolve, reject) => {
    interstitialLoadResolve = resolve;
    interstitialLoadReject = reject;

    const timeoutId = setTimeout(() => {
      interstitialLoading = false;
      interstitialLoadPromise = null;
      interstitialLoadResolve = null;
      interstitialLoadReject = null;
      reject(new Error("Interstitial ad preparation timed out"));
    }, PREPARE_TIMEOUT_MS);

    const originalResolve = resolve;
    const originalReject = reject;
    interstitialLoadResolve = () => {
      clearTimeout(timeoutId);
      originalResolve();
    };
    interstitialLoadReject = (error: Error) => {
      clearTimeout(timeoutId);
      originalReject(error);
    };
  });

  const isTestingAds = await getIsTestingAds();
  try {
    await AdMob.prepareInterstitial({
      adId: INTERSTITIAL_AD_ID,
      isTesting: isTestingAds,
      npa: !allowPersonalizedAds,
    });
  } catch (error) {
    console.warn("[Ads] Interstitial prepare failed", error);
    lastPrepareError = error instanceof Error ? error : new Error(String(error));

    if (retryCount < MAX_RETRY_ATTEMPTS) {
      const delayMs = RETRY_DELAY_BASE_MS * Math.pow(2, retryCount);
      const rejectFn = interstitialLoadReject;
      interstitialLoadPromise = null;
      interstitialLoadResolve = null;
      interstitialLoadReject = null;
      interstitialLoading = false;

      await new Promise((resolve) => setTimeout(resolve, delayMs));

      try {
        return await prepareInterstitial(retryCount + 1);
      } catch (retryError) {
        if (rejectFn) {
          rejectFn(retryError instanceof Error ? retryError : new Error(String(retryError)));
        }
        throw retryError;
      }
    } else {
      interstitialLoading = false;
      interstitialReady = false;
      const rejectFn = interstitialLoadReject;
      const errorToThrow = lastPrepareError || new Error("Interstitial ad preparation failed");
      interstitialLoadPromise = null;
      interstitialLoadResolve = null;
      interstitialLoadReject = null;
      lastPrepareError = null;
      if (rejectFn) {
        rejectFn(errorToThrow);
      }
      throw errorToThrow;
    }
  }

  if (retryCount === 0) {
    lastPrepareError = null;
  }

  return interstitialLoadPromise;
};

const shouldShowInterstitial = async () => true;

const incrementSaveCount = async () => {};

const resetSaveCount = async () => {};

const resetConsent = async () => {
  if (!Capacitor.isNativePlatform()) return;
  
  console.log("[Ads] Resetting UMP consent as requested from Settings");
  
  try {
    // Reset UMP consent state
    await AdMob.resetConsentInfo();
    console.log("[Ads] UMP consent info reset successfully");
    
    // Reset personalized ads flag (will be recomputed after consent flow)
    allowPersonalizedAds = false;
    
    // Update debug info
    debugInfo.consentStatus = "UNKNOWN";
    debugInfo.consentFormAvailable = false;
    debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
    
    // Request consent info again to re-trigger UMP flow
    let consentStatus = AdmobConsentStatus.UNKNOWN;
    try {
      const consentInfo = await AdMob.requestConsentInfo();
      consentStatus = consentInfo.status;
      debugInfo.consentStatus = consentInfo.status as ConsentStatus;
      debugInfo.consentFormAvailable = consentInfo.isConsentFormAvailable;
      debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
      
      // Show consent form if required (for EEA/UK users)
      if (
        consentInfo.isConsentFormAvailable &&
        consentStatus === AdmobConsentStatus.REQUIRED
      ) {
        console.log("[Ads] Showing UMP consent form after reset");
        const { status } = await AdMob.showConsentForm();
        consentStatus = status;
        debugInfo.consentStatus = status as ConsentStatus;
        debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
      }
    } catch (error) {
      console.warn("[Ads] UMP consent flow failed after reset", error);
      debugInfo.consentStatus = "UNKNOWN";
      debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
    }
    
    // Read current ATT status (do NOT attempt to reset ATT - it cannot be reset programmatically)
    try {
      const trackingInfo = await AdMob.trackingAuthorizationStatus();
      debugInfo.trackingStatus = trackingInfo.status as TrackingStatus;
      debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
      
      // Note: We do NOT request ATT authorization here - it can only be reset by user in iOS Settings
      // or by reinstalling the app. The current status is read-only.
    } catch (error) {
      console.warn("[Ads] Failed to read ATT tracking status", error);
      debugInfo.trackingStatus = "unknown";
      debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
    }
    
    // Recompute personalized ads flag based on:
    // - UMP consent status (OBTAINED or NOT_REQUIRED)
    // - Current ATT status (read-only, not reset)
    try {
      const trackingStatus = await AdMob.trackingAuthorizationStatus();
      allowPersonalizedAds =
        (consentStatus === AdmobConsentStatus.OBTAINED ||
          consentStatus === AdmobConsentStatus.NOT_REQUIRED) &&
        trackingStatus.status === "authorized";
      console.log("[Ads] Personalized ads allowed:", allowPersonalizedAds, {
        consentStatus,
        trackingStatus: trackingStatus.status,
      });
    } catch (error) {
      allowPersonalizedAds = false;
      console.warn("[Ads] Failed to determine personalized ads status", error);
    }
    
    // Reload interstitial ad with new consent settings if ads are initialized
    if (isInitialized && interstitialReady) {
      interstitialReady = false;
      void prepareInterstitial().catch((error) => {
        console.warn("[Ads] Failed to prepare interstitial after consent reset", error);
      });
    }
    
    console.log("[Ads] UMP consent reset completed successfully");
  } catch (error) {
    console.error("[Ads] Failed to reset UMP consent", error);
    throw error;
  }
};

export const AdsManager = {
  init: async (retryCount = 0): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;
    if (isInitialized) return;
    if (initPromise) return initPromise;
    
    const enabled = await isAdsEnabled();
    if (!enabled) {
      debugInfo.init = "disabled";
      debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
      return;
    }
    
    initPromise = (async () => {
      debugInfo.init = "initializing";
      debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));

      try {
        await AdMob.initialize();
        isInitialized = true;
        debugInfo.init = "initialized";
        debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
        console.log("[Ads] AdMob initialized successfully");
      } catch (error) {
        console.warn("[Ads] AdMob initialization failed", error);
        debugInfo.init = "failed";
        debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
        isInitialized = false;
        
        if (retryCount < INIT_MAX_RETRY_ATTEMPTS) {
          const delayMs = INIT_RETRY_DELAY_BASE_MS * Math.pow(2, retryCount);
          console.log(`[Ads] Retrying initialization in ${delayMs}ms (attempt ${retryCount + 1}/${INIT_MAX_RETRY_ATTEMPTS})`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          initPromise = null;
          try {
            return await AdsManager.init(retryCount + 1);
          } catch (retryError) {
            console.error("[Ads] Initialization retry failed", retryError);
            initPromise = null;
            throw retryError;
          }
        } else {
          console.error("[Ads] AdMob initialization failed after all retry attempts");
          initPromise = null;
          throw error instanceof Error ? error : new Error(String(error));
        }
      }

      if (!isInitialized) {
        initPromise = null;
        return;
      }

      let consentStatus = AdmobConsentStatus.UNKNOWN;
      try {
        const consentInfo = await AdMob.requestConsentInfo();
        consentStatus = consentInfo.status;
        debugInfo.consentStatus = consentInfo.status as ConsentStatus;
        debugInfo.consentFormAvailable = consentInfo.isConsentFormAvailable;
        debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
        if (
          consentInfo.isConsentFormAvailable &&
          consentStatus === AdmobConsentStatus.REQUIRED
        ) {
          const { status } = await AdMob.showConsentForm();
          consentStatus = status;
          debugInfo.consentStatus = status as ConsentStatus;
          debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
        }
      } catch (error) {
        console.warn("[Ads] Consent flow failed", error);
        debugInfo.consentStatus = "UNKNOWN";
        debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
      }

      try {
        const trackingInfo = await AdMob.trackingAuthorizationStatus();
        debugInfo.trackingStatus = trackingInfo.status as TrackingStatus;
        debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
        if (trackingInfo.status === "notDetermined") {
          await AdMob.requestTrackingAuthorization();
        }
      } catch (error) {
        console.warn("[Ads] Tracking authorization failed", error);
        debugInfo.trackingStatus = "unknown";
        debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
      }

      try {
        const trackingStatus = await AdMob.trackingAuthorizationStatus();
        debugInfo.trackingStatus = trackingStatus.status as TrackingStatus;
        debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
        allowPersonalizedAds =
          (consentStatus === AdmobConsentStatus.OBTAINED ||
            consentStatus === AdmobConsentStatus.NOT_REQUIRED) &&
          trackingStatus.status === "authorized";
        console.log("[Ads] Personalized ads allowed:", allowPersonalizedAds);
      } catch (error) {
        console.warn("[Ads] Failed to determine personalized ads status", error);
        allowPersonalizedAds = false;
      }

      AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => {
        const height = typeof size?.height === "number" ? size.height : 0;
        setBannerHeight(height);
      });

      AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
        bannerVisible = true;
        notifyBannerStatus("visible");
        debugInfo.lastBannerError = "";
        debugInfo.lastBannerShowAt = new Date().toISOString();
        debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
      });

      AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (info) => {
        bannerVisible = false;
        notifyBannerStatus("failed");
        debugInfo.lastBannerError =
          typeof (info as { error?: string })?.error === "string"
            ? (info as { error?: string }).error ?? ""
            : "unknown error";
        debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
      });

      AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
        interstitialReady = true;
        interstitialLoading = false;
        lastPrepareError = null;
        if (interstitialLoadResolve) {
          interstitialLoadResolve();
          interstitialLoadPromise = null;
          interstitialLoadResolve = null;
          interstitialLoadReject = null;
        }
      });

      AdMob.addListener(InterstitialAdPluginEvents.Dismissed, async () => {
        interstitialReady = false;
        void prepareInterstitial().catch(() => {});
      });

      AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, async () => {
        interstitialReady = false;
        if (interstitialLoadReject) {
          interstitialLoadReject(new Error("Interstitial ad failed to show"));
          interstitialLoadPromise = null;
          interstitialLoadResolve = null;
          interstitialLoadReject = null;
        }
        void prepareInterstitial().catch(() => {});
      });

      AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
        interstitialReady = false;
        interstitialLoading = false;
        if (interstitialLoadReject) {
          interstitialLoadReject(new Error("Interstitial ad failed to load"));
          interstitialLoadPromise = null;
          interstitialLoadResolve = null;
          interstitialLoadReject = null;
        }
      });

      try {
        await prepareInterstitial();
      } catch (error) {
        console.warn("[Ads] Failed to prepare interstitial during init", error);
      }
      
      initPromise = null;
    })();
    
    return initPromise;
  },

  showBanner: async () => {
    if (!Capacitor.isNativePlatform()) return;
    const enabled = await isAdsEnabled();
    if (!enabled) {
      await AdsManager.hideBanner();
      return;
    }
    if (!isInitialized) {
      await AdsManager.init();
    }
    if (!isInitialized) return;
    if (bannerVisible) return;
    
    debugInfo.lastBannerRequestAt = new Date().toISOString();
    debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));

    try {
      await AdMob.showBanner({
        adId: BANNER_AD_ID,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: await getIsTestingAds(),
        npa: !allowPersonalizedAds,
      });
    } catch (error) {
      bannerVisible = false;
      notifyBannerStatus("failed");
      setBannerHeight(0);
      console.error("[Ads] Banner show failed", error);
      debugInfo.lastBannerError = error instanceof Error ? error.message : String(error);
      debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
    }
  },

  hideBanner: async () => {
    if (!Capacitor.isNativePlatform()) return;
    if (!bannerVisible) {
      notifyBannerStatus("hidden");
      setBannerHeight(0);
      return;
    }
    bannerVisible = false;
    notifyBannerStatus("hidden");
    setBannerHeight(0);

    try {
      await AdMob.hideBanner();
    } catch (error) {
      console.warn("[Ads] Banner hide failed", error);
    }
  },

  maybeShowInterstitialAfterSave: async ({ kind }: { kind: SaveKind }) => {
    if (!Capacitor.isNativePlatform()) return;
    const enabled = await isAdsEnabled();
    if (!enabled) return;

    if (!isInitialized) {
      await AdsManager.init();
    }
    if (!isInitialized) return;

    if (kind === "create") {
      const hasCreatedOnce = await getBool(PREF_HAS_CREATED_ONCE);
      if (!hasCreatedOnce) {
        await setBool(PREF_HAS_CREATED_ONCE, true);
        return;
      }
    }

    if (kind === "edit") {
      const hasEditedOnce = await getBool(PREF_HAS_EDITED_ONCE);
      if (!hasEditedOnce) {
        await setBool(PREF_HAS_EDITED_ONCE, true);
        return;
      }
    }

    if (kind === "delete") {
      const hasDeletedOnce = await getBool(PREF_HAS_DELETED_ONCE);
      if (!hasDeletedOnce) {
        await setBool(PREF_HAS_DELETED_ONCE, true);
        return;
      }
    }

    await incrementSaveCount();
    const shouldShow = await shouldShowInterstitial();

    if (!shouldShow) {
      if (!interstitialReady && !interstitialLoading) {
        void prepareInterstitial().catch(() => {});
      }
      return;
    }

    if (!interstitialReady) {
      try {
        await prepareInterstitial();
        if (!interstitialReady) return;
      } catch {
        return;
      }
    }

    await setNumber(PREF_LAST_INTERSTITIAL_AT, Date.now());
    await resetSaveCount();

    try {
      await AdMob.showInterstitial();
      interstitialReady = false;
    } catch (error) {
      console.warn("[Ads] Interstitial show failed", error);
      interstitialReady = false;
      void prepareInterstitial().catch(() => {});
    }
  },
  getDevAdsEnabled,
  setDevAdsEnabled,
  toggleDevAdsEnabled: async () => {
    const enabled = await getDevAdsEnabled();
    const next = !enabled;
    await setDevAdsEnabled(next);
    return next;
  },
  setDevBuild: (isDev: boolean) => {
    const prev = isDevBuildRuntime;
    isDevBuildRuntime = isDev;
  },
  getBannerStatus: () => bannerStatus,
  getDebugInfo: () => ({ ...debugInfo }),
  onDebugInfoChange: (listener: (info: typeof debugInfo) => void) => {
    debugInfoListeners.add(listener);
    listener({ ...debugInfo });
    return () => debugInfoListeners.delete(listener);
  },
  onBannerStatusChange: (
    listener: (status: "hidden" | "visible" | "failed") => void,
  ) => {
    bannerStatusListeners.add(listener);
    listener(bannerStatus);
    return () => bannerStatusListeners.delete(listener);
  },
  resetConsent,
  resetInitialization: () => {
    isInitialized = false;
    initPromise = null;
    bannerVisible = false;
    interstitialReady = false;
    interstitialLoading = false;
    interstitialLoadPromise = null;
    interstitialLoadResolve = null;
    interstitialLoadReject = null;
    debugInfo.init = "not-started";
    debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
    notifyBannerStatus("hidden");
    setBannerHeight(0);
  },
};
