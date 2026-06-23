import { IonModal } from '@ionic/react';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TrackingConsentModalProps {
  isOpen: boolean;
  onContinue: () => void;
}

// Custom pre-prompt shown once (after the first event) before the OS ATT sheet
// and the Google UMP consent form. Explains that tracking is only used to show
// more relevant ads and that no data is sent anywhere ourselves.
export function TrackingConsentModal({ isOpen, onContinue }: TrackingConsentModalProps) {
  const { t } = useTranslation();

  return (
    <IonModal
      isOpen={isOpen}
      backdropDismiss={false}
      className="tracking-consent-modal"
    >
      <div className="flex flex-col h-full bg-background px-6 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            {t('trackingConsent.title')}
          </h2>
          <p className="text-base text-muted-foreground max-w-sm leading-relaxed">
            {t('trackingConsent.body')}
          </p>
          <p className="text-sm text-muted-foreground/80 max-w-sm leading-relaxed">
            {t('trackingConsent.reassurance')}
          </p>
        </div>
        <button
          onClick={onContinue}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-semibold text-lg active:scale-[0.98] transition-transform"
        >
          {t('trackingConsent.continue')}
        </button>
      </div>
    </IonModal>
  );
}
