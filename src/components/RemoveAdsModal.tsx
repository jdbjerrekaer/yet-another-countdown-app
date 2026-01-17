import { useEffect, useMemo, useState } from "react";
import {
  IonButton,
  IonContent,
  IonHeader,
  IonModal,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  IonButtons,
} from "@ionic/react";
import { useTranslation } from "react-i18next";
import confetti from "canvas-confetti";
import { IAPProduct } from "@awesome-cordova-plugins/in-app-purchase-2";
import { PurchasesManager } from "@/lib/purchases/purchasesManager";
import { ShieldCheck, Heart, Check, Sparkles, LucideIcon } from "lucide-react";

type RemoveAdsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  isNative: boolean;
  hasRemoveAds: boolean;
  isDevBuild?: boolean;
};

const productLabels: Record<
  string,
  { titleKey: string; descriptionKey: string; badgeKey?: string; icon: LucideIcon }
> = {
  "com.countdown.app.remove_ads": {
    titleKey: "iap.tiers.standard.title",
    descriptionKey: "iap.tiers.standard.description",
    icon: ShieldCheck,
  },
  "com.countdown.app.remove_ads_supporter": {
    titleKey: "iap.tiers.supporter.title",
    descriptionKey: "iap.tiers.supporter.description",
    badgeKey: "iap.tiers.supporter.badge",
    icon: Heart,
  },
};

export const RemoveAdsModal = ({
  isOpen,
  onClose,
  isNative,
  hasRemoveAds,
  isDevBuild,
}: RemoveAdsModalProps) => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  const orderedProductIds = useMemo(
    () => PurchasesManager.getRemoveAdsProducts().map((item) => item.id),
    [],
  );

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setRestoreError(null);
    setRestoreMessage(null);
    if (!isNative) {
      setProducts([]);
      return;
    }
    setLoading(true);
    PurchasesManager.getProducts()
      .then((loaded) => {
        setProducts(loaded);
      })
      .catch((err) => {
        console.warn("[Purchases] Failed to load products", err);
        if (!isDevBuild) {
          setError(t("iap.loadError"));
        }
      })
      .finally(() => setLoading(false));
  }, [isOpen, isNative, t, isDevBuild]);

  const getProductById = (id: string) => products.find((p) => p.id === id);

  const handlePurchase = async (productId: string) => {
    setActionLoadingId(productId);
    try {
      if (isDevBuild) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        await PurchasesManager.setDebugEntitlement(true, productId);
      } else {
        await PurchasesManager.purchaseRemoveAds(productId);
      }
      
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#007AFF", "#5856D6", "#FF2D55"],
        zIndex: 20000,
      });

      if (isDevBuild) {
        // Removed toast success message per user request
      }
    } catch (err) {
      console.warn("[Purchases] Purchase failed", err);
      if (isDevBuild) {
        // Removed toast error message per user request
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestore = async () => {
    setRestoreLoading(true);
    setRestoreError(null);
    setRestoreMessage(null);
    try {
      await PurchasesManager.restorePurchases();
      if (PurchasesManager.hasRemoveAdsEntitlement()) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#007AFF", "#5856D6", "#FF2D55"],
          zIndex: 20000,
        });
        if (isDevBuild) {
          // Removed toast success message per user request
        }
      } else {
        setRestoreError(null);
        setRestoreMessage(t("iap.restoreNone"));
      }
    } catch (err) {
      console.warn("[Purchases] Restore failed", err);
      setRestoreError(t("iap.restoreError"));
      setRestoreMessage(null);
      if (isDevBuild) {
        // Removed toast error message per user request
      }
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} aria-labelledby="iap-modal-title">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onClose} className="text-muted-foreground">{t("modal.close")}</IonButton>
          </IonButtons>
          <IonTitle id="iap-modal-title">{t("iap.title")}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="max-w-md mx-auto space-y-8">
          <div className="space-y-3 text-center pt-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-2 animate-scale-in">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {t("iap.headline")}
            </h2>
            <p className="text-muted-foreground text-sm px-4">
              {t("iap.subheadline")}
            </p>
          </div>

          {!isNative && (
            <div className="bg-secondary/50 rounded-2xl p-4 text-center text-sm text-muted-foreground border border-border/50">
              {t("iap.webUnavailable")}
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 animate-fade-in">
              <IonSpinner name="crescent" color="primary" />
              <span className="text-sm font-medium text-muted-foreground">
                {t("iap.loadingProducts")}
              </span>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 text-center">
              <IonText color="danger" className="text-sm font-medium">
                {error}
              </IonText>
            </div>
          )}

          <div className="space-y-4">
            {orderedProductIds.map((productId, index) => {
              const product = getProductById(productId);
              const labels = productLabels[productId];
              const Icon = labels?.icon || ShieldCheck;
              const badge = labels?.badgeKey ? t(labels.badgeKey) : null;
              const priceLabel =
                product?.price || (isDevBuild ? "€0.00 (Dev)" : t("iap.priceFallback"));
              const isBusy = actionLoadingId === productId;
              const isSupporter = productId.includes("supporter");

              return (
                <div
                  key={productId}
                  className={`relative overflow-hidden rounded-3xl border transition-all duration-300 ${
                    isSupporter
                      ? "border-primary/30 bg-primary/5 shadow-sm"
                      : "border-border bg-secondary/30"
                  } p-5 animate-slide-up`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-2xl flex-shrink-0 ${
                      isSupporter ? "bg-primary text-primary-foreground" : "bg-background text-foreground"
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-foreground truncate">
                          {labels ? t(labels.titleKey) : product?.title}
                        </h3>
                        {badge && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground uppercase tracking-wider">
                            {badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        {labels ? t(labels.descriptionKey) : product?.description}
                      </p>
                      
                      <div className="flex items-center justify-between mt-auto">
                        <div className="text-xl font-bold text-foreground">
                          {priceLabel}
                        </div>
                        
                        <IonButton
                          className={`min-w-[100px] h-10 font-bold tracking-tight rounded-xl ${
                            isSupporter ? "black-button" : ""
                          }`}
                          disabled={(!isNative && !isDevBuild) || hasRemoveAds || isBusy}
                          onClick={() => handlePurchase(productId)}
                        >
                          {isBusy ? (
                            <IonSpinner name="crescent" />
                          ) : hasRemoveAds ? (
                            <div className="flex items-center gap-1.5">
                              <Check className="w-4 h-4" />
                              <span>{t("iap.alreadyUnlocked")}</span>
                            </div>
                          ) : (
                            t("iap.cta")
                          )}
                        </IonButton>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-4 pt-4">
            <div className="text-center">
              <p className="text-[11px] text-muted-foreground/70 max-w-[280px] mx-auto leading-normal">
                {t("iap.disclaimer")}
              </p>
            </div>

            <IonButton
              fill="clear"
              size="small"
              onClick={handleRestore}
              className="text-muted-foreground font-medium lowercase tracking-tight"
              disabled={(!isNative && !isDevBuild) || restoreLoading}
            >
              {restoreLoading ? (
                <IonSpinner name="crescent" className="mr-2" />
              ) : (
                t("iap.restore")
              )}
            </IonButton>

            {restoreError && (
              <div className="bg-destructive/5 rounded-xl p-3 text-center animate-fade-in">
                <p className="text-xs font-medium text-destructive">{restoreError}</p>
              </div>
            )}
            {restoreMessage && (
              <div className="bg-secondary/50 rounded-xl p-3 text-center animate-fade-in">
                <p className="text-xs font-medium text-muted-foreground">{restoreMessage}</p>
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
};
