import { useEffect, useRef, useState } from 'react';
import { IonModal } from '@ionic/react';
import { App as CapacitorApp } from '@capacitor/app';
import { ChevronLeft, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  FrameFit,
  WidgetOnboardingFrame,
  type FrameName,
} from '@/components/WidgetOnboardingFrames';
import CalendarPlugin from '@/plugins/CalendarPlugin';
import './onboarding.css';

interface WidgetOnboardingModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  /**
   * Open straight on the confirmation screen. Set by the caller when it opened
   * this *because* it spotted a new widget. Detection lives in the caller, not
   * here — this component is only open some of the time, and the widget usually
   * appears while the app is closed.
   */
  startOnSuccess?: boolean;
}

/**
 * iOS 16–17 opens the widget gallery from a "+" at the top of the Home Screen;
 * iOS 18 and later from "Edit" → "Add Widget". The WKWebView user agent carries
 * the OS version ("... CPU iPhone OS 18_0 like Mac OS X ..."), so no plugin is
 * needed. Unknown → assume the newer flow, which covers most devices.
 * ponytail: UA sniff instead of adding @capacitor/device for one integer.
 */
function usesEditButton(): boolean {
  const major = Number(/ OS (\d+)[_ ]/.exec(navigator.userAgent)?.[1]);
  return !major || major >= 18;
}

function Illustration({ name }: { name: FrameName }) {
  return (
    <FrameFit>
      <WidgetOnboardingFrame name={name} />
    </FrameFit>
  );
}

/** `wo-primary` mirrors the FAB's surface exactly (see onboarding.css). */
const PRIMARY_BUTTON =
  'wo-primary w-full rounded-2xl py-4 text-lg font-semibold transition-transform duration-150 active:scale-[0.97]';

export function WidgetOnboardingModal({
  isOpen,
  onDismiss,
  startOnSuccess = false,
}: WidgetOnboardingModalProps) {
  const { t } = useTranslation();
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [installed, setInstalled] = useState(startOnSuccess);
  const trackRef = useRef<HTMLDivElement>(null);

  // Covers only the case where the user leaves and returns *while this is open*.
  // Launch-time detection is the caller's job — see `startOnSuccess`.
  useEffect(() => {
    if (!isOpen || installed) return;
    let cancelled = false;

    const check = async () => {
      const { count } = await CalendarPlugin.getInstalledWidgets();
      if (!cancelled && count > 0) setInstalled(true);
    };

    const handle = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void check();
    });

    return () => {
      cancelled = true;
      void handle.then((h) => h.remove());
    };
  }, [isOpen, installed]);

  const editFlow = usesEditButton();
  const steps = [
    { image: '01-long-press' as FrameName, caption: t('widget.onboarding.step1') },
    {
      image: (editFlow ? '02-tap-edit' : '02-tap-plus') as FrameName,
      caption: editFlow ? t('widget.onboarding.step2Edit') : t('widget.onboarding.step2Plus'),
    },
    { image: '03-search' as FrameName, caption: t('widget.onboarding.step3') },
    { image: '04-add-widget' as FrameName, caption: t('widget.onboarding.step4') },
  ];
  const isLast = step === steps.length - 1;

  const goTo = (next: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
  };

  // The track is the source of truth for `step` so swiping and the buttons agree.
  const handleScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    setStep(Math.round(track.scrollLeft / track.clientWidth));
  };

  const close = () => {
    setStarted(false);
    setStep(0);
    setInstalled(startOnSuccess);
    onDismiss();
  };

  return (
    <IonModal isOpen={isOpen} backdropDismiss={false} className="widget-onboarding-modal">
      <div className="wo-root flex h-full flex-col bg-background pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <div className="flex h-11 shrink-0 items-center justify-between px-4">
          {started && step > 0 ? (
            <button
              onClick={() => goTo(step - 1)}
              aria-label={t('widget.onboarding.back')}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-transform duration-150 active:scale-95"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : (
            <span className="h-9 w-9" />
          )}
          <button
            onClick={close}
            aria-label={t('widget.onboarding.close')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-transform duration-150 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Both layers stay mounted so the hero morphs into step one. */}
        <div className="relative min-h-0 flex-1">
          <div
            className="wo-layer wo-layer--intro absolute inset-0 flex flex-col"
            data-hidden={started || installed}
            aria-hidden={started || installed}
          >
            <div className="min-h-0 flex-1 px-6">
              <Illustration name="05-done" />
            </div>
            <div className="shrink-0 space-y-2 px-6 pt-6 text-center">
              <h2 className="text-2xl font-bold text-foreground">
                {t('widget.onboarding.title')}
              </h2>
              <p className="mx-auto max-w-sm text-base leading-relaxed text-muted-foreground">
                {t('widget.onboarding.subtitle')}
              </p>
            </div>
          </div>

          <div
            className="wo-layer wo-layer--steps absolute inset-0 flex flex-col"
            data-hidden={!started || installed}
            aria-hidden={!started || installed}
          >
            <div
              ref={trackRef}
              onScroll={handleScroll}
              className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {steps.map((s, i) => (
                <div
                  key={s.image}
                  data-active={i === step}
                  className="wo-slide w-full shrink-0 snap-center px-6"
                >
                  <Illustration name={s.image} />
                </div>
              ))}
            </div>
            <p
              key={step}
              className="wo-caption mx-auto min-h-[4.5rem] max-w-sm shrink-0 px-6 pt-6 text-center text-lg font-medium leading-snug text-foreground"
            >
              {steps[step].caption}
            </p>
          </div>

          <div
            className="wo-layer wo-layer--success absolute inset-0 flex flex-col"
            data-hidden={!installed}
            aria-hidden={!installed}
          >
            <div className="min-h-0 flex-1 px-6">
              <Illustration name="05-done" />
            </div>
            <div className="shrink-0 space-y-2 px-6 pt-6 text-center">
              <h2 className="text-2xl font-bold text-foreground">
                {t('widget.onboarding.successTitle')}
              </h2>
              <p className="mx-auto max-w-sm text-base leading-relaxed text-muted-foreground">
                {t('widget.onboarding.successSubtitle')}
              </p>
            </div>
          </div>
        </div>

        {installed ? (
          <div className="shrink-0 px-6 pt-6">
            <button onClick={close} className={PRIMARY_BUTTON}>
              {t('widget.onboarding.done')}
            </button>
          </div>
        ) : !started ? (
          <div className="shrink-0 space-y-2 px-6 pt-6">
            <button onClick={() => setStarted(true)} className={PRIMARY_BUTTON}>
              {t('widget.onboarding.cta')}
            </button>
            <button
              onClick={close}
              className="w-full rounded-2xl py-3 text-base font-medium text-muted-foreground transition-transform duration-150 active:scale-[0.97]"
            >
              {t('widget.onboarding.dismiss')}
            </button>
          </div>
        ) : (
          <>
            <div className="flex shrink-0 justify-center gap-2 py-4" aria-hidden="true">
              {steps.map((s, i) => (
                <span
                  key={s.image}
                  className={`wo-dot h-2 w-2 rounded-full transition-colors duration-200 ${
                    i === step ? 'is-on' : ''
                  }`}
                />
              ))}
            </div>
            <div className="shrink-0 px-6">
              <button
                onClick={() => (isLast ? close() : goTo(step + 1))}
                className={PRIMARY_BUTTON}
              >
                {isLast ? t('widget.onboarding.done') : t('widget.onboarding.next')}
              </button>
            </div>
          </>
        )}
      </div>
    </IonModal>
  );
}
