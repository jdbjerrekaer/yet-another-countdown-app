import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  CatalogLoadResult,
  PurchasesManager,
} from "@/lib/purchases/purchasesManager";
import { IAP_TIMING } from "@/lib/purchases/constants";
import { useHaptic } from "@/hooks/useHaptic";
import { ShieldCheck, Heart, Check, Sparkles, LucideIcon } from "lucide-react";
import { TFunction } from "i18next";

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
  "com.jonatanbjerrekaer.countdown.remove_ads": {
    titleKey: "iap.tiers.standard.title",
    descriptionKey: "iap.tiers.standard.description",
    icon: ShieldCheck,
  },
  "com.jonatanbjerrekaer.countdown.remove_ads_supporter": {
    titleKey: "iap.tiers.supporter.title",
    descriptionKey: "iap.tiers.supporter.description",
    badgeKey: "iap.tiers.supporter.badge",
    icon: Heart,
  },
};

type PurchasePhase =
  | "idle"
  | "preparing"
  | "ordering"
  | "awaiting-entitlement"
  | "succeeded";

const classifyPurchaseError = (errorMessage: string) => {
  const normalized = errorMessage.toLowerCase();
  const cancelled =
    normalized.includes("cancelled") ||
    normalized.includes("canceled") ||
    normalized.includes("paymentcancelled");

  const transient =
    normalized.includes("skinternalerrordomain code=11") ||
    normalized.includes("temporarily unavailable") ||
    normalized.includes("store not available") ||
    normalized.includes("network");

  if (cancelled) return "cancelled";
  if (transient) return "transient";
  return "fatal";
};

const getPurchaseErrorMessage = (err: unknown, t: TFunction): string | null => {
  const errorMessage = err instanceof Error ? err.message : String(err);
  const classification = classifyPurchaseError(errorMessage);
  const normalized = errorMessage.toLowerCase();

  if (classification === "cancelled") {
    return null;
  }
  if (normalized.includes("productunavailable")) {
    return t("iap.loadError");
  }
  return t("iap.purchaseError");
};

const getCatalogDebugReason = (catalog: CatalogLoadResult): string | null => {
  const diagnostics = catalog.diagnostics;

  if (diagnostics.storeKitProductFetchError) {
    return diagnostics.storeKitProductFetchError;
  }

  if (diagnostics.lastLoadFailureReason) {
    return diagnostics.lastLoadFailureReason;
  }

  if (catalog.unavailableProductIds.length > 0) {
    return `Unavailable product IDs: ${catalog.unavailableProductIds.join(", ")}`;
  }

  if (diagnostics.bootstrapError) {
    return `Bootstrap failed: ${diagnostics.bootstrapError}`;
  }

  if (
    diagnostics.storeKitComparisonStatus === "wrapper_plugin_hydration_failure" &&
    diagnostics.storeKitComparisonMessage
  ) {
    return diagnostics.storeKitComparisonMessage;
  }

  if (diagnostics.hasUnpricedProducts && diagnostics.unpricedProductIds.length > 0) {
    return `Products loaded without prices: ${diagnostics.unpricedProductIds.join(", ")}`;
  }

  if (
    diagnostics.receiptLoadErrorIgnored &&
    diagnostics.lastReceiptErrorMessage
  ) {
    return diagnostics.lastReceiptErrorMessage;
  }

  if (diagnostics.lastStoreErrorMessage) {
    return diagnostics.lastStoreErrorMessage;
  }

  return null;
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
  const confettiShownRef = useRef(false);
  const closeTriggeredRef = useRef(false);
  const lastLoggedCatalogErrorRef = useRef<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogLoadResult>(() =>
    PurchasesManager.getCatalogLoadResult(),
  );
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchasePhase, setPurchasePhase] = useState<PurchasePhase>("idle");
  const [catalogRequestInFlight, setCatalogRequestInFlight] = useState(false);
  const loadProductsRef = useRef<
    ((options?: { force?: boolean; reason?: string }) => Promise<void>) | null
  >(null);
  const orderedProductIds = useMemo(
    () => PurchasesManager.getRemoveAdsProducts().map((item) => item.id),
    [],
  );
  const visibleProductIds = useMemo(
    () => {
      if (!isNative) {
        return orderedProductIds;
      }
      return orderedProductIds.filter((productId) =>
        catalog.products.some((product) => product.id === productId),
      );
    },
    [catalog.products, isNative, orderedProductIds],
  );
  const hasVisibleProducts = visibleProductIds.length > 0;
  const hasAttemptedCatalogLoad = Boolean(catalog.diagnostics.loadStartedAt);
  const catalogSettled =
    hasAttemptedCatalogLoad &&
    (Boolean(catalog.diagnostics.loadCompletedAt) || catalog.status !== "loading");
  const loading =
    isNative &&
    !isDevBuild &&
    !hasVisibleProducts &&
    (!catalogSettled ||
      catalogRequestInFlight ||
      catalog.status === "loading" ||
      catalog.diagnostics.bootstrapInProgress);
  const showGlobalLoadError =
    isNative &&
    !isDevBuild &&
    !loading &&
    catalogSettled &&
    !hasVisibleProducts &&
    catalog.status === "unavailable";
  const error = showGlobalLoadError ? t("iap.loadError") : null;
  const loggedCatalogDebugReason = showGlobalLoadError
    ? getCatalogDebugReason(catalog)
    : null;
  const visibleCatalogDebugReason =
    isDevBuild && showGlobalLoadError ? loggedCatalogDebugReason : null;

  useEffect(() => {
    if (!showGlobalLoadError || !isOpen) {
      lastLoggedCatalogErrorRef.current = null;
      return;
    }

    const diagnostics = PurchasesManager.getDiagnostics();
    const failureSignature = JSON.stringify({
      status: catalog.status,
      errorCode: catalog.errorCode,
      errorMessage: catalog.errorMessage,
      unavailableProductIds: catalog.unavailableProductIds,
      lastLoadFailureReason: diagnostics.lastLoadFailureReason,
      lastStoreErrorCode: diagnostics.lastStoreErrorCode,
      lastStoreErrorMessage: diagnostics.lastStoreErrorMessage,
      bootstrapError: diagnostics.bootstrapError,
      catalogSource: diagnostics.catalogSource,
      storeKitProductFetchError: diagnostics.storeKitProductFetchError,
      storeKitComparisonStatus: diagnostics.storeKitComparisonStatus,
      storeKitComparisonMessage: diagnostics.storeKitComparisonMessage,
      pricedProductIds: diagnostics.pricedProductIds,
      unpricedProductIds: diagnostics.unpricedProductIds,
      receiptLoadErrorIgnored: diagnostics.receiptLoadErrorIgnored,
      lastReceiptErrorCode: diagnostics.lastReceiptErrorCode,
      lastReceiptErrorMessage: diagnostics.lastReceiptErrorMessage,
    });

    if (lastLoggedCatalogErrorRef.current === failureSignature) {
      return;
    }

    lastLoggedCatalogErrorRef.current = failureSignature;

    console.error("[IAP Modal] Catalog load failed", {
      debugReason: loggedCatalogDebugReason,
      catalog: {
        status: catalog.status,
        errorCode: catalog.errorCode,
        errorMessage: catalog.errorMessage,
        unavailableProductIds: catalog.unavailableProductIds,
      },
      diagnostics,
    });
  }, [catalog, isOpen, loggedCatalogDebugReason, showGlobalLoadError]);

  useEffect(() => {
    if (hasRemoveAds) {
      setPurchaseError(null);
      if (isOpen && !closeTriggeredRef.current) {
        closeTriggeredRef.current = true;
        onClose();
      }
      if (!confettiShownRef.current && isOpen) {
        confettiShownRef.current = true;
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#007AFF", "#5856D6", "#FF2D55"],
          zIndex: 20000,
        });
      }
    }
  }, [hasRemoveAds, isOpen, onClose]);

  const handleCloseClick = () => {
    trigger("light");
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      setCatalogRequestInFlight(false);
      return;
    }

    let cancelled = false;
    confettiShownRef.current = false;
    closeTriggeredRef.current = false;
    PurchasesManager.setDevBuild(!!isDevBuild);
    setRestoreError(null);
    setRestoreMessage(null);
    setPurchaseError(null);
    setPurchasePhase("idle");
    const currentCatalog = PurchasesManager.getCatalogLoadResult();
    setCatalog(currentCatalog);
    setCatalogRequestInFlight(false);
    if (!isNative) {
      return;
    }

    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
      (window as unknown as { toggleIAPTestMode?: () => void }).toggleIAPTestMode = () => {
        const current = PurchasesManager.getTestMode();
        PurchasesManager.setTestMode({ forceLoadFailure: !current.forceLoadFailure });
        console.log(`[IAP] Test mode: forceLoadFailure=${!current.forceLoadFailure}`);
      };
    }

    const unsubscribe = PurchasesManager.onCatalogChange((result) => {
      if (!cancelled) {
        setCatalog(result);
      }
    });

    const loadProducts = async (options?: { force?: boolean; reason?: string }) => {
      if (!cancelled) {
        setCatalogRequestInFlight(true);
      }
      try {
        await PurchasesManager.loadCatalog({
          reason: options?.reason ?? "modal-open",
          force: options?.force,
          operation: "passive",
        });
      } catch (err) {
        console.warn("[IAP Modal] Failed to load catalog", err);
      } finally {
        if (!cancelled) {
          setCatalogRequestInFlight(false);
        }
      }
    };

    loadProductsRef.current = loadProducts;
    void loadProducts({
      force:
        currentCatalog.products.length === 0 ||
        currentCatalog.status === "unavailable" ||
        currentCatalog.diagnostics.bootstrapError !== null,
      reason: "modal-open",
    });

    return () => {
      cancelled = true;
      loadProductsRef.current = null;
      unsubscribe();
    };
  }, [isOpen, isNative, isDevBuild]);

  const getProductById = (id: string) => catalog.products.find((product) => product.id === id);

  const handlePurchase = async (productId: string) => {
    if (actionLoadingId !== null) {
      return;
    }

    setActionLoadingId(productId);
    setPurchaseError(null);
    setPurchasePhase("preparing");
    trigger("light");

    if (!isNative && !isDevBuild) {
      setPurchaseError(t("iap.loadError"));
      setPurchasePhase("idle");
      setActionLoadingId(null);
      return;
    }

    let product = getProductById(productId);

    if (!product && !isDevBuild) {
      const latestCatalog = await PurchasesManager.loadCatalog({
        reason: "modal-purchase",
        operation: "passive",
      });
      setCatalog(latestCatalog);
      product = latestCatalog.products.find((item) => item.id === productId);
    }

    if (!product && !isDevBuild) {
      setPurchaseError(t("iap.loadError"));
      setPurchasePhase("idle");
      setActionLoadingId(null);
      return;
    }

    try {
      setPurchasePhase("ordering");
      const purchasePromise = isDevBuild
        ? (async () => {
            await new Promise((resolve) => setTimeout(resolve, IAP_TIMING.devPurchaseDelayMs));
            await PurchasesManager.setDevEntitlement(true, productId);
          })()
        : PurchasesManager.purchaseRemoveAds(productId);

      setPurchasePhase("awaiting-entitlement");
      await purchasePromise;
      setPurchasePhase("succeeded");
      setPurchaseError(null);
    } catch (err) {
      console.warn("[Purchases] Purchase failed", err);
      setPurchaseError(getPurchaseErrorMessage(err, t));
      setPurchasePhase("idle");
    } finally {
      setActionLoadingId(null);
      if (!hasRemoveAds) {
        setPurchasePhase("idle");
      }
    }
  };

  const handleRestore = async () => {
    setRestoreLoading(true);
    setRestoreError(null);
    setRestoreMessage(null);
    try {
      const restored = await PurchasesManager.restorePurchases();
      if (restored) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#007AFF", "#5856D6", "#FF2D55"],
          zIndex: 20000,
        });
        setRestoreMessage(t("iap.restoreSuccess"));
      } else {
        setRestoreError(null);
        setRestoreMessage(t("iap.restoreNone"));
      }
    } catch (err) {
      console.warn("[Purchases] Restore failed", err);
      setRestoreError(t("iap.restoreError"));
      setRestoreMessage(null);
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
            <div className="bg-destructive/5 border border-destructive/10 rounded-2xl p-4 animate-fade-in">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <IonText color="danger" className="block text-sm font-medium leading-relaxed">
                    {error}
                  </IonText>
                  {visibleCatalogDebugReason && (
                    <p className="mt-2 break-words text-[11px] leading-relaxed text-destructive/80">
                      {visibleCatalogDebugReason}
                    </p>
                  )}
                </div>
                {isNative && (
                  <IonButton
                    fill="outline"
                    size="small"
                    onClick={() => {
                      if (loadProductsRef.current) {
                        void loadProductsRef.current({
                          force: true,
                          reason: "modal-retry",
                        });
                      }
                    }}
                    className="m-0 shrink-0"
                  >
                    {t("iap.retry") || "Retry"}
                  </IonButton>
                )}
              </div>
            </div>
          )}

          {purchaseError && (
            <div className="bg-destructive/5 border border-destructive/10 rounded-2xl p-4 text-center animate-fade-in">
              <IonText color="danger" className="text-sm font-medium">
                {purchaseError}
              </IonText>
            </div>
          )}

          {visibleProductIds.length > 0 && (
            <div className="space-y-3">
            {visibleProductIds.map((productId) => {
              const product = getProductById(productId);
              const labels = productLabels[productId];
              if (!product && !labels) {
                return null;
              }
              const Icon = labels?.icon || ShieldCheck;
              const badge = labels?.badgeKey ? t(labels.badgeKey) : null;
              const priceLabel = product?.price || (isDevBuild ? "€0.00 (Dev)" : null);
              const isBusy =
                actionLoadingId === productId &&
                purchasePhase !== "idle" &&
                purchasePhase !== "succeeded";
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
                      {priceLabel && (
                        <div className="text-sm font-bold text-foreground mb-1">
                          {priceLabel}
                        </div>
                      )}
                      <IonButton
                        size="small"
                        fill={isSupporter ? "solid" : "clear"}
                        className={`font-bold tracking-tight m-0 h-8 ${
                          isSupporter ? "black-button min-w-[80px]" : "text-primary min-w-[70px]"
                        }`}
                        style={{
                          minHeight: '32px',
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent',
                          cursor: 'pointer',
                        }}
                        disabled={
                          (!isNative && !isDevBuild) ||
                          hasRemoveAds ||
                          isBusy ||
                          loading
                        }
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
          )}

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
                  disabled={
                    (!isNative && !isDevBuild) ||
                    restoreLoading ||
                    loading
                  }
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
