import { createRoot } from "react-dom/client";
import { setupIonicReact } from "@ionic/react";
import { isPlatform } from "@ionic/core";
import {
  iosTransitionAnimation,
  popoverEnterAnimation,
  popoverLeaveAnimation,
} from "@rdlabo/ionic-theme-ios26";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { SplashScreen } from "@capacitor/splash-screen";
import { App as CapacitorApp } from "@capacitor/app";
import { Preferences } from "@capacitor/preferences";
import App from "./App.tsx";
import "./i18n"; // Initialize i18n
import { checkPreferencesLanguage } from "./i18n";
import { AdsManager } from "./lib/ads/adsManager";

/* Ionic Core CSS */
import "@ionic/react/css/core.css";

/* Ionic CSS utils (recommended for Ionic components to render correctly) */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Optional Ionic CSS utilities */
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import "@ionic/react/css/palettes/dark.always.css"; */
import "@ionic/react/css/palettes/dark.class.css";
/* import "@ionic/react/css/palettes/dark.system.css"; */

/* Custom app styles (after Ionic so we can override) */
import "./index.css";

/* Force iOS mode for consistent native iOS feel */
setupIonicReact({
  mode: "ios",
  navAnimation: isPlatform("ios") ? iosTransitionAnimation : undefined,
  popoverEnter: isPlatform("ios") ? popoverEnterAnimation : undefined,
  popoverLeave: isPlatform("ios") ? popoverLeaveAnimation : undefined,
});

/* Configure native plugins when running on a native platform */
async function initNativePlugins() {
  if (Capacitor.isNativePlatform()) {
    try {
      // Configure status bar for iOS-native feel
      // Set initial style based on system preference (will be updated by useSystemTheme hook)
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      await StatusBar.setStyle({ style: prefersDark ? Style.Dark : Style.Light });
      await StatusBar.setOverlaysWebView({ overlay: true });
    } catch (e) {
      console.warn("StatusBar plugin error:", e);
    }

    try {
      // Configure keyboard behavior
      await Keyboard.setResizeMode({ mode: KeyboardResize.None });
      await Keyboard.setScroll({ isDisabled: false });
    } catch (e) {
      console.warn("Keyboard plugin error:", e);
    }

    try {
      // Hide splash screen after app is ready
      await SplashScreen.hide();
    } catch (e) {
      console.warn("SplashScreen plugin error:", e);
    }

    try {
      await AdsManager.init();
    } catch (e) {
      console.warn("AdMob initialization error:", e);
    }
  }
}

initNativePlugins();

// Check for consent reset trigger from iOS Settings
async function checkConsentResetFlag() {
  if (!Capacitor.isNativePlatform()) return;
  
  let triggerDetected = false;
  
  try {
    const { value } = await Preferences.get({ key: "reset_consent_trigger" });
    if (value === "1") {
      triggerDetected = true;
      console.log("[App] Consent reset trigger detected from iOS Settings");
    }
  } catch (error) {
    console.warn("[App] Failed to read consent reset trigger:", error);
    return; // Can't proceed if we can't read the value
  }
  
  if (!triggerDetected) {
    return; // No trigger detected, nothing to do
  }
  
  // Reset the Settings value FIRST (before calling resetConsent) to ensure users can
  // always trigger the reset again, even if the consent reset process fails.
  // This guarantees the Settings UI will show "No" and allow another attempt.
  try {
    await Preferences.set({ key: "reset_consent_trigger", value: "0" });
    console.log("[App] Settings value reset to default (users can trigger again)");
  } catch (error) {
    console.error("[App] Failed to reset Settings value - this may prevent future resets:", error);
    // Continue anyway - try to reset consent even if Settings write failed
  }
  
  // Now trigger the UMP consent reset (ATT is not reset)
  try {
    await AdsManager.resetConsent();
    console.log("[App] UMP consent reset completed successfully");
  } catch (error) {
    console.error("[App] UMP consent reset failed, but Settings value was already reset:", error);
    // Don't throw - the Settings reset already happened, so user can try again
  }
}

// Check consent reset flag on app launch
checkConsentResetFlag();

// Listen for app state changes to check language preference and consent reset flag
if (Capacitor.isNativePlatform()) {
  CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
    if (isActive) {
      // App came to foreground, check if language preference changed
      await checkPreferencesLanguage();
      // Check if consent reset was requested from Settings
      await checkConsentResetFlag();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
