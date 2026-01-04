import { createRoot } from "react-dom/client";
import { setupIonicReact } from "@ionic/react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { SplashScreen } from "@capacitor/splash-screen";
import App from "./App.tsx";
import "./i18n"; // Initialize i18n

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

/* Custom app styles (after Ionic so we can override) */
import "./index.css";

/* Force iOS mode for consistent native iOS feel */
setupIonicReact({ mode: "ios" });

/* Configure native plugins when running on a native platform */
async function initNativePlugins() {
  if (Capacitor.isNativePlatform()) {
    try {
      // Configure status bar for iOS-native feel
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setOverlaysWebView({ overlay: true });
    } catch (e) {
      console.warn("StatusBar plugin error:", e);
    }

    try {
      // Configure keyboard behavior
      await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
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
  }
}

initNativePlugins();

createRoot(document.getElementById("root")!).render(<App />);
