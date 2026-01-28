import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Redirect } from "react-router-dom";
import { IonApp, IonRouterOutlet } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Import from "./pages/Import";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Support from "./pages/Support";
import { DeepLinkHandler } from "./components/DeepLinkHandler";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";
import { PurchasesManager } from "@/lib/purchases/purchasesManager";
import { useTranslation } from "react-i18next";

const queryClient = new QueryClient();

// Hook to apply system theme preference
function useSystemTheme() {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = async (isDark: boolean) => {
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
        document.documentElement.classList.add('ion-palette-dark');
        document.documentElement.style.colorScheme = 'dark';
        if (Capacitor.isNativePlatform()) {
          try {
            await StatusBar.setStyle({ style: Style.Dark });
          } catch (e) {
            console.warn("StatusBar style update failed", e);
          }
        }
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
        document.documentElement.classList.remove('ion-palette-dark');
        document.documentElement.style.colorScheme = 'light';
        if (Capacitor.isNativePlatform()) {
          try {
            await StatusBar.setStyle({ style: Style.Light });
          } catch (e) {
            console.warn("StatusBar style update failed", e);
          }
        }
      }
    };
    
    // Apply initial theme
    applyTheme(mediaQuery.matches);
    
    // Listen for changes
    const handleChange = (e: MediaQueryListEvent) => {
      applyTheme(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
}

const App = () => {
  useSystemTheme();
  const { i18n } = useTranslation();
  const [, setLanguage] = useState(i18n.language);

  useEffect(() => {
    void PurchasesManager.init();
  }, []);

  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      setLanguage(lng);
    };
    
    i18n.on('languageChanged', handleLanguageChanged);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <IonApp>
          <IonReactRouter basename={import.meta.env.BASE_URL}>
            <DeepLinkHandler />
            <IonRouterOutlet>
              <Route exact path="/" component={Index} />
              <Route path="/import" component={Import} />
              <Route path="/privacy" component={PrivacyPolicy} />
              <Route path="/support" component={Support} />
              <Route path="/404" component={NotFound} />
              {/* Catch-all redirects to 404 page */}
              <Redirect to="/404" />
            </IonRouterOutlet>
          </IonReactRouter>
        </IonApp>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
