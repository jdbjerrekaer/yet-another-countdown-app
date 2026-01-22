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
import { useHaptic } from "@/hooks/useHaptic";
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
  const { trigger } = useHaptic();
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  const handleCloseClick = () => {
    trigger('light');
    onClose();
  };

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
            <IonButton onClick={handleCloseClick} className="text-primary font-medium">{t("modal.close")}</IonButton>
          </IonButtons>
          <IonTitle id="iap-modal-title" className="font-semibold">{t("iap.title")}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding" style={{ "--padding-bottom": "var(--ad-banner-height, 0px)" } as React.CSSProperties}>
        <div className="max-w-md mx-auto space-y-8 pb-8">
          <div className="flex flex-col gap-2 text-center pt-4">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-1">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {t("iap.headline")}
              </h2>
              <p className="text-muted-foreground text-sm px-4 leading-normal">
                {t("iap.subheadline")}
              </p>
            </div>
          </div>

          {!isNative && (
            <div className="bg-secondary/40 rounded-2xl p-4 text-center text-sm text-muted-foreground border border-border/40">
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
            <div className="bg-destructive/5 border border-destructive/10 rounded-2xl p-4 text-center">
              <IonText color="danger" className="text-sm font-medium">
                {error}
              </IonText>
            </div>
          )}

          <div className="space-y-3">
            {orderedProductIds.map((productId) => {
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
                  className={`relative overflow-hidden rounded-2xl border transition-transform active:scale-[0.98] ${
                    isSupporter
                      ? "border-primary/20 bg-primary/5"
                      : "border-border/60 bg-secondary/20"
                  } p-5`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isSupporter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-base font-bold text-foreground truncate">
                          {labels ? t(labels.titleKey) : product?.title}
                        </h3>
                        {badge && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-primary/10 text-primary uppercase tracking-wider">
                            {badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug">
                        {labels ? t(labels.descriptionKey) : product?.description}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-foreground mb-1">
                        {priceLabel}
                      </div>
                      <IonButton
                        size="small"
                        fill={isSupporter ? "solid" : "clear"}
                        className={`font-bold tracking-tight m-0 h-8 ${
                          isSupporter ? "black-button min-w-[80px]" : "text-primary min-w-[70px]"
                        }`}
                        disabled={(!isNative && !isDevBuild) || hasRemoveAds || isBusy}
                        onClick={() => handlePurchase(productId)}
                      >
                        {isBusy ? (
                          <IonSpinner name="crescent" className="w-4 h-4" />
                        ) : hasRemoveAds ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          t("iap.cta")
                        )}
                      </IonButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div 
            key={`disclaimer-${isOpen}`}
            className="flex flex-col gap-2 pt-2 pb-8"
          >
            <div className="text-center px-6">
              <p className="text-[10px] text-muted-foreground/60 leading-normal">
                {t("iap.disclaimer")}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <IonButton
                fill="clear"
                onClick={handleRestore}
                className="text-primary text-sm font-semibold h-10 m-0"
                disabled={(!isNative && !isDevBuild) || restoreLoading}
              >
                {restoreLoading ? (
                  <IonSpinner name="crescent" className="w-4 h-4" />
                ) : (
                  t("iap.restore")
                )}
              </IonButton>

              {restoreError && (
                <div className="bg-destructive/5 rounded-xl p-3 text-center animate-fade-in">
                  <p className="text-[11px] font-medium text-destructive">{restoreError}</p>
                </div>
              )}
              {restoreMessage && (
                <div className="bg-secondary/50 rounded-xl p-3 text-center animate-fade-in">
                  <p className="text-[11px] font-medium text-muted-foreground">{restoreMessage}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
};
