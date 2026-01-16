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
const IS_TESTING = import.meta.env.MODE !== "production";
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

const setBannerHeight = (height: number) => {
  if (typeof document === "undefined") return;
  const safeHeight = Number.isFinite(height) ? height : 0;
  document.documentElement.style.setProperty(
    "--ad-banner-height",
    `${Math.max(0, Math.round(safeHeight))}px`,
  );
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
  if (!IS_TESTING) return true;
  return getDevAdsEnabled();
};

const prepareInterstitial = async () => {
  if (interstitialLoading) return;
  interstitialLoading = true;
  try {
    await AdMob.prepareInterstitial({
      adId: INTERSTITIAL_AD_ID,
      isTesting: IS_TESTING,
      npa: !allowPersonalizedAds,
      immersiveMode: true,
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
    isInitialized = true;

    try {
      await AdMob.initialize();
    } catch (error) {
      console.warn("[Ads] AdMob initialization failed", error);
    }

    let consentStatus = AdmobConsentStatus.UNKNOWN;
    try {
      const consentInfo = await AdMob.requestConsentInfo();
      consentStatus = consentInfo.status;
      if (
        consentInfo.isConsentFormAvailable &&
        consentStatus === AdmobConsentStatus.REQUIRED
      ) {
        const { status } = await AdMob.showConsentForm();
        consentStatus = status;
      }
    } catch (error) {
      console.warn("[Ads] Consent flow failed", error);
    }

    try {
      const trackingInfo = await AdMob.trackingAuthorizationStatus();
      if (trackingInfo.status === "notDetermined") {
        await AdMob.requestTrackingAuthorization();
      }
    } catch (error) {
      console.warn("[Ads] Tracking authorization failed", error);
    }

    try {
      const trackingStatus = await AdMob.trackingAuthorizationStatus();
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
    bannerVisible = true;

    try {
      await AdMob.showBanner({
        adId: BANNER_AD_ID,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: IS_TESTING,
        npa: !allowPersonalizedAds,
      });
    } catch (error) {
      bannerVisible = false;
      setBannerHeight(0);
      console.warn("[Ads] Banner show failed", error);
    }
  },

  hideBanner: async () => {
    if (!Capacitor.isNativePlatform()) return;
    if (!bannerVisible) return;
    bannerVisible = false;
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
};
