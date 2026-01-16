import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import {
  AdMob,
  AdmobConsentStatus,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  InterstitialAdPluginEvents,
} from "@capacitor-community/admob";

type SaveKind = "create" | "edit";

const BANNER_AD_ID = "ca-app-pub-2483551077156189/1520554438";
const INTERSTITIAL_AD_ID = "ca-app-pub-2483551077156189/3401430555";
const IS_DEV_BUILD_FALLBACK = import.meta.env.MODE !== "production";
let isDevBuildRuntime = IS_DEV_BUILD_FALLBACK;
let allowPersonalizedAds = false;

const COOLDOWN_MS = 120_000;
const SAVE_COUNT_THRESHOLD = 3;

const PREF_HAS_CREATED_ONCE = "ads_hasCreatedOnce";
const PREF_HAS_EDITED_ONCE = "ads_hasEditedOnce";
const PREF_LAST_INTERSTITIAL_AT = "ads_lastInterstitialAt";
const PREF_SAVE_COUNT_SINCE_INTERSTITIAL = "ads_saveCountSinceLastInterstitial";
const PREF_DEV_ADS_ENABLED = "ads_devEnabled";

let isInitialized = false;
let bannerVisible = false;
let interstitialReady = false;
let interstitialLoading = false;
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
  if (
    safeHeight === 0 &&
    document.documentElement.dataset.adPlaceholder === "true"
  ) {
    return;
  }
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
  if (!isDevBuildRuntime) return true;
  const enabled = await getDevAdsEnabled();
  return enabled;
};

const getIsTestingAds = async () => {
  if (!isDevBuildRuntime) return false;
  const enabled = await getDevAdsEnabled();
  return enabled;
};

const prepareInterstitial = async () => {
  if (interstitialLoading) return;
  interstitialLoading = true;
  const isTestingAds = await getIsTestingAds();
  try {
    await AdMob.prepareInterstitial({
      adId: INTERSTITIAL_AD_ID,
      isTesting: isTestingAds,
      npa: !allowPersonalizedAds,
    });
  } catch (error) {
    interstitialLoading = false;
    interstitialReady = false;
    console.warn("[Ads] Interstitial prepare failed", error);
  }
};

const shouldShowInterstitial = async () => {
  const lastShownAt = await getNumber(PREF_LAST_INTERSTITIAL_AT);
  if (Date.now() - lastShownAt < COOLDOWN_MS) {
    return false;
  }

  const saveCount = await getNumber(PREF_SAVE_COUNT_SINCE_INTERSTITIAL);
  if (saveCount < SAVE_COUNT_THRESHOLD) {
    return false;
  }

  return true;
};

const incrementSaveCount = async () => {
  const saveCount = await getNumber(PREF_SAVE_COUNT_SINCE_INTERSTITIAL);
  await setNumber(PREF_SAVE_COUNT_SINCE_INTERSTITIAL, saveCount + 1);
};

const resetSaveCount = async () => {
  await setNumber(PREF_SAVE_COUNT_SINCE_INTERSTITIAL, 0);
};

export const AdsManager = {
  init: async () => {
    if (!Capacitor.isNativePlatform() || isInitialized) return;
    const enabled = await isAdsEnabled();
    if (!enabled) return;
    debugInfo.init = "initializing";
    debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
    isInitialized = true;

    try {
      await AdMob.initialize();
      debugInfo.init = "initialized";
      debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
    } catch (error) {
      console.warn("[Ads] AdMob initialization failed", error);
      debugInfo.init = "failed";
      debugInfoListeners.forEach((listener) => listener({ ...debugInfo }));
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
    } catch (error) {
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
    });

    AdMob.addListener(InterstitialAdPluginEvents.Dismissed, async () => {
      interstitialReady = false;
      await prepareInterstitial();
    });

    AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, async () => {
      interstitialReady = false;
      await prepareInterstitial();
    });

    AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
      interstitialReady = false;
      interstitialLoading = false;
    });

    await prepareInterstitial();
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
      console.warn("[Ads] Banner show failed", error);
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

    await incrementSaveCount();
    const shouldShow = await shouldShowInterstitial();
    if (!shouldShow) {
      if (!interstitialReady) {
        await prepareInterstitial();
      }
      return;
    }

    if (!interstitialReady) {
      await prepareInterstitial();
      return;
    }

    interstitialReady = false;
    await setNumber(PREF_LAST_INTERSTITIAL_AT, Date.now());
    await resetSaveCount();

    try {
      await AdMob.showInterstitial();
    } catch (error) {
      console.warn("[Ads] Interstitial show failed", error);
      await prepareInterstitial();
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
};
