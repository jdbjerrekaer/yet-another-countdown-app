import { useEffect, useMemo, useRef, useState } from 'react';
import { IonDatetime, IonModal } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { ChevronLeft, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmojiContainer } from '@/components/EmojiContainer';
import { EmojiShapePicker } from '@/components/EmojiShapePicker';
import { ColorWheelPicker } from '@/components/ColorWheelPicker';
import type { EmojiShape } from '@/lib/emojiShapes';
import { COLOR_PALETTE } from '@/lib/colorPalette';
import { getEmojiSuggestions } from '@/lib/emojiSuggestions';
import EmojiKeyboardPlugin from '@/plugins/EmojiKeyboardPlugin';
import { useHaptic } from '@/hooks/useHaptic';
import '@/components/WidgetOnboardingModal/onboarding.css';
import './firstrun.css';

/**
 * Which way the countdown runs. This is never a field on the event — the app
 * derives it from whether the target date is past or future. So the question is
 * really "which kind of moment is this?", and the answer only steers the copy,
 * the emoji defaults and which half of the calendar is selectable.
 */
type Direction = 'future' | 'past';

interface FirstRunOnboardingModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onCreate: (
    title: string,
    date: Date,
    emoji: string,
    isRecurring: boolean,
    hasSpecificTime: boolean,
    emojiColor?: string,
    emojiShape?: EmojiShape,
  ) => void | Promise<void>;
}

const EMOJI_DEFAULTS: Record<Direction, string[]> = {
  future: ['🎉', '🎂', '✈️', '🎤', '🎄', '🎓', '🏖️', '🎁', '⚽', '🎬', '💍'],
  past: ['💛', '🌱', '🚭', '💪', '🏡', '👶', '🐾', '☀️', '🏃', '🧘', '🍀'],
};

/** Title shortcuts. Keys resolve under `firstRun.suggest.*`. */
const TITLE_SUGGESTIONS: Record<Direction, string[]> = {
  future: ['birthday', 'concert', 'trip', 'holiday'],
  past: ['anniversary', 'together', 'quitSmoking', 'newJob'],
};

const STEPS = ['title', 'emoji', 'shape', 'color', 'date'] as const;
type Step = (typeof STEPS)[number];

const PRIMARY_BUTTON =
  'wo-primary w-full rounded-2xl py-4 text-lg font-semibold transition-transform duration-150 active:scale-[0.97] disabled:opacity-40';

const DAY = 24 * 60 * 60 * 1000;
const isIOS = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

/** Local ISO (no timezone suffix) — what IonDatetime expects. */
function toLocalISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

function atMorning(d: Date) {
  const copy = new Date(d);
  copy.setHours(8, 0, 0, 0);
  return copy;
}

export function FirstRunOnboardingModal({
  isOpen,
  onDismiss,
  onCreate,
}: FirstRunOnboardingModalProps) {
  const { t } = useTranslation();
  const { trigger } = useHaptic();

  const [direction, setDirection] = useState<Direction | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [goingBack, setGoingBack] = useState(false);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('');
  const [shape, setShape] = useState<EmojiShape>('squircle');
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [date, setDate] = useState<Date | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  /** Set once they choose an emoji themselves, which stops the auto-pick. */
  const emojiPickedRef = useRef(false);

  // Custom emoji, same mechanism as the add-event sheet: on iOS a native
  // emoji-only keyboard, everywhere else a plain input.
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const customInputRef = useRef<HTMLInputElement>(null);
  const keyboardListenerRef = useRef<PluginListenerHandle | null>(null);

  const step: Step = STEPS[stepIndex];

  // The keyboard is the whole point of the title step, so open it for them.
  useEffect(() => {
    if (!isOpen || step !== 'title') return;
    const timer = window.setTimeout(() => titleInputRef.current?.focus(), 350);
    return () => window.clearTimeout(timer);
  }, [isOpen, step]);

  const closeEmojiKeyboard = async () => {
    if (keyboardListenerRef.current) {
      await keyboardListenerRef.current.remove();
      keyboardListenerRef.current = null;
    }
    if (isIOS()) EmojiKeyboardPlugin.hideEmojiKeyboard().catch(() => {});
    setCustomOpen(false);
  };

  useEffect(() => () => void closeEmojiKeyboard(), []);

  const pickEmoji = (value: string) => {
    trigger('light');
    emojiPickedRef.current = true;
    setEmoji(value);
  };

  const openCustomEmoji = async () => {
    trigger('light');
    setCustomOpen(true);
    setCustomValue('');
    if (keyboardListenerRef.current) {
      await keyboardListenerRef.current.remove();
      keyboardListenerRef.current = null;
    }
    if (!isIOS()) {
      window.setTimeout(() => customInputRef.current?.focus(), 100);
      return;
    }
    try {
      await EmojiKeyboardPlugin.showEmojiKeyboard({ initialText: '' });
      keyboardListenerRef.current = await EmojiKeyboardPlugin.addListener(
        'emojiTextChanged',
        ({ text }) => {
          const match = (text || '').match(/[\p{Emoji}\p{Extended_Pictographic}]/u);
          if (match) {
            emojiPickedRef.current = true;
            setEmoji(match[0]);
          }
        },
      );
    } catch {
      window.setTimeout(() => customInputRef.current?.focus(), 100);
    }
  };

  // Suggestions for whatever they typed, topped up with the direction's own
  // set. A word like "Concert" only matches one emoji, and a grid of one reads
  // as broken — the defaults fill the rest. The chosen emoji is always in the
  // list, so a custom pick keeps a tile to sit in.
  const emojiChoices = useMemo(() => {
    const trimmed = title.trim();
    const matches = trimmed ? getEmojiSuggestions(trimmed, 8).map((r) => r.unicode) : [];
    const list = [...new Set([...matches, ...EMOJI_DEFAULTS[direction ?? 'future']])].slice(0, 11);
    return emoji && !list.includes(emoji) ? [emoji, ...list].slice(0, 11) : list;
  }, [title, direction, emoji]);

  // Pre-pick the best guess so the emoji step is a confirmation, not a chore,
  // and keep re-picking as they type — until they choose one themselves.
  useEffect(() => {
    if (emojiPickedRef.current || !emojiChoices.length) return;
    setEmoji(emojiChoices[0]);
  }, [emojiChoices]);

  const reset = () => {
    setDirection(null);
    setStepIndex(0);
    setGoingBack(false);
    setTitle('');
    setEmoji('');
    emojiPickedRef.current = false;
    setShape('squircle');
    setColor(COLOR_PALETTE[0]);
    setDate(null);
    void closeEmojiKeyboard();
  };

  const close = () => {
    reset();
    onDismiss();
  };

  const chooseDirection = (next: Direction) => {
    trigger('light');
    setDirection(next);
    setEmoji('');
    emojiPickedRef.current = false;
    // A sensible starting point on either side of today; they still confirm it.
    setDate(atMorning(new Date(Date.now() + (next === 'future' ? 30 * DAY : -30 * DAY))));
  };

  const go = (delta: number) => {
    trigger('light');
    void closeEmojiKeyboard();
    setGoingBack(delta < 0);
    if (stepIndex + delta < 0) {
      setDirection(null);
      return;
    }
    setStepIndex((i) => Math.min(STEPS.length - 1, Math.max(0, i + delta)));
  };

  const dateIsValid =
    !!date && (direction === 'past' ? date.getTime() < Date.now() : date.getTime() > Date.now());

  const canAdvance =
    step === 'title' ? title.trim().length > 0 : step === 'date' ? dateIsValid : true;

  const finish = async () => {
    if (!date || !canAdvance) return;
    trigger('medium');
    // Recurring and time-of-day are deliberately not asked here — both are
    // editable on the card afterwards, and neither is worth a screen on the
    // very first countdown.
    await onCreate(title.trim(), date, emoji, false, false, color, shape);
    reset();
  };

  const dayCount = date
    ? Math.max(0, Math.round(Math.abs(date.getTime() - Date.now()) / DAY))
    : 0;

  const heading =
    step === 'title' || step === 'date'
      ? t(`firstRun.step.${step}.${direction ?? 'future'}`)
      : t(`firstRun.step.${step}`);

  // Only the two gesture-driven steps get a hint. The emoji grid is a plain
  // tap, and telling people to hold there just competes with the shape step.
  const hint =
    step === 'shape' ? t('firstRun.hint.shape') : step === 'color' ? t('firstRun.hint.color') : null;

  const preview = (
    <div className="flex shrink-0 flex-col items-center gap-3 px-6">
      <div key={`${emoji}-${shape}-${color}`} className="fr-preview-pop">
        {/* emojiClassName is set explicitly: EmojiContainer defaults to text-2xl,
            which is tuned for a ~64px tile and looks lost at this size. */}
        <EmojiContainer
          emoji={emoji || '⏳'}
          shape={shape}
          color={color}
          size={96}
          emojiClassName="text-4xl"
        />
      </div>
      <p className="line-clamp-1 text-xl font-bold text-foreground">
        {title.trim() || t('firstRun.previewPlaceholder')}
      </p>
      {dateIsValid && (
        <p className="text-base text-muted-foreground">
          {t(direction === 'past' ? 'firstRun.daysSince' : 'firstRun.daysAway', {
            count: dayCount,
          })}
        </p>
      )}
    </div>
  );

  return (
    <IonModal isOpen={isOpen} backdropDismiss={false} className="widget-onboarding-modal">
      <div className="wo-root fr-root flex h-full flex-col bg-background pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <div className="flex h-11 shrink-0 items-center justify-between px-4">
          {direction ? (
            <button
              onClick={() => go(-1)}
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

        <div className="relative min-h-0 flex-1">
          {/* Direction. Both layers stay mounted so the question pushes back as
              the flow arrives, rather than being swapped out. The three blocks
              split the screen 20 / 40 / 40 — the cards carry this screen. */}
          <div
            className="wo-layer wo-layer--intro absolute inset-0 flex flex-col gap-3 px-5 pb-2"
            data-hidden={!!direction}
            aria-hidden={!!direction}
          >
            <div className="flex flex-[2] flex-col justify-center gap-1 text-center">
              <h2 className="text-2xl font-bold text-foreground">{t('firstRun.title')}</h2>
              <p className="text-base leading-snug text-muted-foreground">
                {t('firstRun.subtitle')}
              </p>
            </div>

            {(['future', 'past'] as Direction[]).map((d) => (
              <button
                key={d}
                onClick={() => chooseDirection(d)}
                className="fr-card flex flex-[4] flex-col justify-center rounded-3xl px-6 text-left"
              >
                <span className="text-4xl">{d === 'future' ? '🎉' : '💛'}</span>
                <p className="mt-4 text-xl font-bold text-foreground">
                  {t(`firstRun.direction.${d}.title`)}
                </p>
                <p className="mt-1 text-base leading-snug text-muted-foreground">
                  {t(`firstRun.direction.${d}.examples`)}
                </p>
                <p className="mt-4 text-base font-semibold text-muted-foreground">
                  {t(`firstRun.direction.${d}.sample`)}
                </p>
              </button>
            ))}
          </div>

          <div
            className="wo-layer wo-layer--steps absolute inset-0 flex flex-col"
            data-hidden={!direction}
            aria-hidden={!direction}
          >
            {step !== 'title' && preview}

            <div
              key={step}
              data-back={goingBack}
              className="fr-step min-h-0 flex-1 overflow-y-auto px-6 pt-5"
            >
              <h2 className="text-center text-xl font-bold text-foreground">{heading}</h2>
              {hint && (
                <p className="mx-auto mt-1 max-w-xs text-center text-sm text-muted-foreground">
                  {hint}
                </p>
              )}

              <div className="mt-5">
                {step === 'title' && (
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        ref={titleInputRef}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && canAdvance) go(1);
                        }}
                        enterKeyHint="next"
                        maxLength={40}
                        placeholder={t(`firstRun.placeholder.${direction ?? 'future'}`)}
                        className="w-full rounded-2xl bg-secondary py-4 pl-14 pr-14 text-center text-lg font-medium text-foreground outline-none placeholder:text-muted-foreground"
                      />
                      {title && (
                        <button
                          onClick={() => {
                            trigger('light');
                            setTitle('');
                            titleInputRef.current?.focus();
                          }}
                          aria-label={t('firstRun.clear')}
                          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background text-muted-foreground transition-transform duration-150 active:scale-90"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {TITLE_SUGGESTIONS[direction ?? 'future'].map((key) => (
                        <button
                          key={key}
                          onClick={() => {
                            trigger('light');
                            setTitle(t(`firstRun.suggest.${key}`));
                          }}
                          className="fr-chip rounded-full px-4 py-2 text-sm font-medium text-foreground"
                        >
                          {t(`firstRun.suggest.${key}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tiles are the app's own EmojiShapePicker: tap selects, press
                    and hold opens the shape ring. Same element for every tile so
                    selecting never remounts it and severs an in-flight drag. */}
                {step === 'emoji' && (
                  <div className="grid grid-cols-4 justify-items-center gap-3">
                    {emojiChoices.map((e) => (
                      /* Fixed square box, else the grid column stretches the
                         tile wide. The inner 56px picker is scaled up rather
                         than given a bigger `size`, so the emoji grows with it. */
                      <div
                        key={e}
                        className="flex h-[70px] w-[70px] items-center justify-center"
                      >
                        <div className="fr-tile-scale h-14 w-14">
                          <EmojiShapePicker
                            shape={shape}
                            color={color}
                            emoji={e}
                            onChange={setShape}
                            size={56}
                            selected={e === emoji}
                            onSelect={() => pickEmoji(e)}
                          />
                        </div>
                      </div>
                    ))}
                    {customOpen ? (
                      <input
                        ref={customInputRef}
                        value={customValue}
                        onChange={(e) => {
                          const match = e.target.value.match(
                            /[\p{Emoji}\p{Extended_Pictographic}]/u,
                          );
                          setCustomValue(match?.[0] ?? '');
                          if (match) {
                            emojiPickedRef.current = true;
                            setEmoji(match[0]);
                          }
                        }}
                        onBlur={() => void closeEmojiKeyboard()}
                        placeholder={t('modal.customEmojiPlaceholder')}
                        maxLength={2}
                        enterKeyHint="done"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        className="h-[70px] w-[70px] rounded-2xl text-center text-3xl text-white outline-none [&::placeholder]:opacity-40"
                        style={{ background: color }}
                      />
                    ) : (
                      <button
                        onClick={() => void openCustomEmoji()}
                        aria-label={t('modal.customEmojiTitle')}
                        className="fr-tile flex h-[70px] w-[70px] items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/30"
                      >
                        <Plus className="h-6 w-6 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                )}

                {/* One big tile, no grid: the point of this screen is the
                    gesture, which is the only way shapes are changed in the app. */}
                {step === 'shape' && (
                  <div className="fr-hero flex justify-center pt-8">
                    {/* Scaled rather than sized up: EmojiShapePicker pins its
                        emoji to text-xl for a 56px tile, so a bigger `size`
                        leaves the emoji stranded in the middle. The popover is
                        portalled to body, so it escapes this transform. */}
                    <EmojiShapePicker
                      shape={shape}
                      color={color}
                      emoji={emoji || '⏳'}
                      onChange={setShape}
                      size={56}
                    />
                  </div>
                )}

                {step === 'color' && (
                  /* peekOnMount scrolls the strip one swatch and back, so it's
                     obvious it moves. A CSS translate was tried first and reads
                     as nothing: the strip is full-bleed, so shifting it leaves
                     the screen looking identical. */
                  <ColorWheelPicker
                    value={color}
                    onChange={setColor}
                    emoji={emoji}
                    peekOnMount
                  />
                )}

                {step === 'date' && (
                  <div className="flex justify-center">
                    <IonDatetime
                      presentation="date"
                      preferWheel={false}
                      value={date ? toLocalISO(date) : undefined}
                      min={direction === 'future' ? toLocalISO(new Date()) : undefined}
                      max={direction === 'past' ? toLocalISO(new Date()) : undefined}
                      firstDayOfWeek={1}
                      onIonChange={(e) => {
                        const value = e.detail.value;
                        if (typeof value === 'string') setDate(atMorning(new Date(value)));
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {direction && (
          <>
            <div className="flex shrink-0 justify-center gap-2 py-4" aria-hidden="true">
              {STEPS.map((s, i) => (
                <span
                  key={s}
                  className={`wo-dot h-2 w-2 rounded-full transition-colors duration-200 ${
                    i === stepIndex ? 'is-on' : ''
                  }`}
                />
              ))}
            </div>
            <div className="shrink-0 px-6">
              <button
                onClick={() => (step === 'date' ? void finish() : go(1))}
                disabled={!canAdvance}
                className={PRIMARY_BUTTON}
              >
                {step === 'date' ? t('firstRun.create') : t('widget.onboarding.next')}
              </button>
            </div>
          </>
        )}
      </div>
    </IonModal>
  );
}
