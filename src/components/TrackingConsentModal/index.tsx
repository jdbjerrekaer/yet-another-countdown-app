import { IonModal } from '@ionic/react';
import { BadgeDollarSign, ShieldCheck, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TrackingConsentModalProps {
  isOpen: boolean;
  onContinue: () => void;
}

export function TrackingConsentModal({ isOpen, onContinue }: TrackingConsentModalProps) {
  const { t } = useTranslation();
  const translatedPoints = t('trackingConsent.points', { returnObjects: true });
  const points = Array.isArray(translatedPoints) ? translatedPoints : [];
  const icons = [Sparkles, BadgeDollarSign, ShieldCheck];

  return (
    <IonModal
      isOpen={isOpen}
      backdropDismiss={false}
      className="tracking-consent-modal"
    >
      <div className="flex flex-col h-full bg-background px-6 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {t('trackingConsent.title')}
            </h2>
            <p className="text-base text-muted-foreground max-w-sm leading-relaxed">
              {t('trackingConsent.intro')}
            </p>
          </div>
          <ul className="w-full max-w-sm space-y-3" aria-label={t('trackingConsent.pointsLabel')}>
            {points.map((point, index) => {
              const Icon = icons[index] ?? ShieldCheck;
              return (
                <li key={point} className="flex items-start gap-3 text-left">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    {point}
                  </span>
                </li>
              );
            })}
          </ul>
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
