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
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { IAPProduct } from "@awesome-cordova-plugins/in-app-purchase-2";
import { PurchasesManager } from "@/lib/purchases/purchasesManager";

type RemoveAdsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  isNative: boolean;
  hasRemoveAds: boolean;
  isDevBuild?: boolean;
};

const productLabels: Record<
  string,
  { titleKey: string; descriptionKey: string; badgeKey?: string }
> = {
  "com.countdown.app.remove_ads": {
    titleKey: "iap.tiers.standard.title",
    descriptionKey: "iap.tiers.standard.description",
  },
  "com.countdown.app.remove_ads_supporter": {
    titleKey: "iap.tiers.supporter.title",
    descriptionKey: "iap.tiers.supporter.description",
    badgeKey: "iap.tiers.supporter.badge",
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

  const orderedProductIds = useMemo(
    () => PurchasesManager.getRemoveAdsProducts().map((item) => item.id),
    [],
  );

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
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

      toast.success(t("iap.purchaseSuccess"));
    } catch (err) {
      console.warn("[Purchases] Purchase failed", err);
      toast.error(t("iap.purchaseError"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestore = async () => {
    setRestoreLoading(true);
    try {
      await PurchasesManager.restorePurchases();
      if (PurchasesManager.hasRemoveAdsEntitlement()) {
        toast.success(t("iap.restoreSuccess"));
      } else {
        toast.message(t("iap.restoreNone"));
      }
    } catch (err) {
      console.warn("[Purchases] Restore failed", err);
      toast.error(t("iap.restoreError"));
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} aria-labelledby="iap-modal-title">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onClose}>{t("modal.cancel")}</IonButton>
          </IonButtons>
          <IonTitle id="iap-modal-title">{t("iap.title")}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-semibold text-foreground">
              {t("iap.headline")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("iap.subheadline")}
            </p>
          </div>

          {!isNative && (
            <div className="text-center text-sm text-muted-foreground">
              {t("iap.webUnavailable")}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <IonSpinner name="crescent" />
              {t("iap.loadingProducts")}
            </div>
          )}

          {error && (
            <IonText color="danger" className="text-center">
              <p>{error}</p>
            </IonText>
          )}

          <div className="space-y-4">
            {orderedProductIds.map((productId) => {
              const product = getProductById(productId);
              const labels = productLabels[productId];
              const badge = labels?.badgeKey ? t(labels.badgeKey) : null;
              const priceLabel =
                product?.price || (isDevBuild ? "€0.00 (Dev)" : t("iap.priceFallback"));
              const isBusy = actionLoadingId === productId;

              return (
                <div
                  key={productId}
                  className="rounded-2xl border border-border bg-secondary/30 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground">
                          {labels ? t(labels.titleKey) : product?.title}
                        </h3>
                        {badge && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            {badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {labels ? t(labels.descriptionKey) : product?.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-semibold text-foreground">
                        {priceLabel}
                      </p>
                    </div>
                  </div>

                  <IonButton
                    expand="block"
                    className="black-button mt-4"
                    disabled={!isNative || hasRemoveAds || isBusy}
                    onClick={() => handlePurchase(productId)}
                    aria-label={`${t('iap.purchase')} ${labels ? t(labels.titleKey) : product?.title}`}
                  >
                    {isBusy ? (
                      <IonSpinner name="crescent" />
                    ) : hasRemoveAds ? (
                      t("iap.alreadyUnlocked")
                    ) : (
                      t("iap.cta")
                    )}
                  </IonButton>
                </div>
              );
            })}
          </div>

          <div className="space-y-2 text-center text-xs text-muted-foreground">
            <p>{t("iap.disclaimer")}</p>
          </div>

          <IonButton
            expand="block"
            fill="outline"
            onClick={handleRestore}
            disabled={!isNative || restoreLoading}
            aria-label={t('iap.restorePurchases')}
          >
            {restoreLoading ? (
              <IonSpinner name="crescent" />
            ) : (
              t("iap.restore")
            )}
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
};
