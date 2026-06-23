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
const setBannerHeight = (height: number) => {
  if (typeof document === "undefined") return;
  const safeHeight = Number.isFinite(height) ? height : 0;
  document.documentElement.style.setProperty(
    "--ad-banner-height",
    `${Math.max(0, Math.round(safeHeight))}px`,
  );
};

const notifyBannerStatus = (status: "hidden" | "visible" | "failed") => {
  bannerStatus = status;
  bannerStatusListeners.forEach((listener) => listener(status));
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
    await AdMob.resetConsentInfo();
    console.log("[Ads] UMP consent info reset successfully");

    allowPersonalizedAds = false;

    await AdsManager.resetInitialization();
    await AdsManager.init();

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
      return;
    }
    
    initPromise = (async () => {
      // ATT + Google UMP consent are deferred to requestTrackingConsent(),
      // fired only after the user creates their first event and confirms the
      // custom pre-prompt modal. init() just sets up the SDK so (non-
      // personalized) banners can show in the meantime.
      try {
        await AdMob.initialize();
        isInitialized = true;
        console.log("[Ads] AdMob initialized successfully");
      } catch (error) {
        console.warn("[Ads] AdMob initialization failed", error);
        isInitialized = false;

        if (retryCount < INIT_MAX_RETRY_ATTEMPTS) {
          const delayMs = INIT_RETRY_DELAY_BASE_MS * Math.pow(2, retryCount);
          console.log(`[Ads] Retrying initialization in ${delayMs}ms (attempt ${retryCount + 1}/${INIT_MAX_RETRY_ATTEMPTS})`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          initPromise = null;
          return await AdsManager.init(retryCount + 1);
        } else {
          initPromise = null;
          throw error instanceof Error ? error : new Error(String(error));
        }
      }

      try {
        const trackingStatus = await AdMob.trackingAuthorizationStatus();
        
        if (trackingStatus.status === "authorized") {
          allowPersonalizedAds = true;
          console.log("[Ads] ATT authorized - personalized ads enabled");
        } else if (trackingStatus.status === "denied" || trackingStatus.status === "restricted") {
          allowPersonalizedAds = false;
          console.log("[Ads] ATT denied/restricted - personalized ads disabled");
        } else {
          allowPersonalizedAds = false;
          console.log("[Ads] ATT status unclear - defaulting to no personalized ads");
        }
      } catch (error) {
        console.warn("[Ads] Failed to determine consent from ATT", error);
        allowPersonalizedAds = false;
      }

      AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => {
        const height = typeof size?.height === "number" ? size.height : 0;
        setBannerHeight(height);
      });

      AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
        bannerVisible = true;
        notifyBannerStatus("visible");
      });

      AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => {
        bannerVisible = false;
        notifyBannerStatus("failed");
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

      // Prepare first interstitial
      void prepareInterstitial().catch(() => {});
    })();

    return initPromise;
  },

  // True only when we should surface the custom pre-prompt before the OS ATT
  // sheet: native, not ad-free, and the user hasn't answered ATT yet.
  shouldShowTrackingPrePrompt: async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false;
    if (!(await isAdsEnabled())) return false;
    try {
      const { status } = await AdMob.trackingAuthorizationStatus();
      return status === "notDetermined";
    } catch {
      return false;
    }
  },

  // Runs after the user confirms the pre-prompt modal: Apple ATT, then the
  // Google UMP (EU) consent form, then refreshes personalization + banner.
  requestTrackingConsent: async (): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;
    if (!(await isAdsEnabled())) return;

    try {
      const { status } = await AdMob.trackingAuthorizationStatus();
      if (status === "notDetermined") {
        await AdMob.requestTrackingAuthorization();
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    } catch (error) {
      console.warn("[Ads] ATT request failed", error);
    }

    try {
      const info = await AdMob.requestConsentInfo();
      if (info?.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
        await AdMob.showConsentForm();
      }
    } catch (error) {
      console.warn("[Ads] UMP consent failed", error);
    }

    try {
      const { status } = await AdMob.trackingAuthorizationStatus();
      allowPersonalizedAds = status === "authorized";
    } catch {
      allowPersonalizedAds = false;
    }

    // Make sure the SDK is up and re-show the banner so the new npa flag applies.
    if (!isInitialized) {
      await AdsManager.init();
    }
    if (bannerVisible) {
      await AdsManager.hideBanner();
    }
    await AdsManager.showBanner();
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
    isDevBuildRuntime = isDev;
  },
  getBannerStatus: () => bannerStatus,
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
    notifyBannerStatus("hidden");
    setBannerHeight(0);
  },
};
