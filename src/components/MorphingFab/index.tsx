import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { IonIcon } from '@ionic/react';
import { checkmark } from 'ionicons/icons';

export interface MorphingFabConfirmOptions {
  onUndo?: () => void;
  holdMs?: number;
  onDismiss?: () => void;
}

export interface MorphingFabHandle {
  confirm: (text: string, options?: MorphingFabConfirmOptions) => void;
}

interface Props {
  icon: string;
  onClick: () => void;
  ariaLabel: string;
  disabled?: boolean;
}

const COLLAPSED_WIDTH = 72;
const TEXT_LEFT_PADDING = 24;
const TEXT_RIGHT_GAP = 16;
const TEXT_BUFFER = 4;
const MIN_EXPANDED_WIDTH = 200;
const VIEWPORT_MARGIN = 32;
const RADIUS = 18;
const EXPAND_MS = 340;
const DEFAULT_HOLD_MS = 1400;
const COLLAPSE_MS = 280;
const GLYPH_MORPH_MS = 300;

// Stacked glyph layers for the icon cross-fade. Exactly one is "active" for any
// given (confirming, hasUndo) combination; the others fade/scale out. The idle
// glyph is not listed here — it is composed per render so a change of the `icon`
// prop (+ ↔ ✓) cross-fades through the same stack instead of hard-cutting.
const GLYPHS: {
  key: string;
  active: (confirming: boolean, hasUndo: boolean) => boolean;
  render: (icon: string) => JSX.Element;
}[] = [
  {
    key: 'check',
    active: (confirming, hasUndo) => confirming && !hasUndo,
    render: () => <IonIcon icon={checkmark} style={{ fontSize: 40 }} />,
  },
  {
    key: 'undo',
    active: (confirming, hasUndo) => confirming && hasUndo,
    render: () => (
      <svg aria-hidden="true" viewBox="0 0 19 19" width={30} height={30} fill="currentColor">
        <path d="M0 6.57227C0 6.80664 0.0976562 7.03125 0.292969 7.2168L6.03516 12.8516C6.20117 13.0273 6.45508 13.125 6.66016 13.125C7.1875 13.125 7.5293 12.7734 7.5293 12.2656C7.5293 12.0117 7.44141 11.8262 7.29492 11.6699L4.47266 8.92578L1.71875 6.57227L4.47266 4.20898L7.29492 1.46484C7.44141 1.30859 7.5293 1.12305 7.5293 0.869141C7.5293 0.361328 7.1875 0.00976562 6.66016 0.00976562C6.45508 0.00976562 6.20117 0.107422 6.03516 0.283203L0.292969 5.91797C0.0976562 6.10352 0 6.32812 0 6.57227ZM8.48633 17.3633C8.48633 17.8418 8.83789 18.2324 9.375 18.2324H11.6309C15.9961 18.2324 18.457 15.7422 18.457 12.002C18.457 8.27148 15.9277 5.69336 11.4746 5.69336H4.91211L1.67969 5.83984C1.2793 5.85938 0.957031 6.16211 0.957031 6.57227C0.957031 6.97266 1.2793 7.27539 1.67969 7.29492L4.91211 7.44141H11.6211C14.9512 7.44141 16.709 9.27734 16.709 11.9043C16.709 14.541 14.9512 16.4941 11.6211 16.4941H9.375C8.83789 16.4941 8.48633 16.8848 8.48633 17.3633Z" />
      </svg>
    ),
  },
];

export const MorphingFab = forwardRef<MorphingFabHandle, Props>(
  ({ icon, onClick, ariaLabel, disabled }, ref) => {
    const [confirming, setConfirming] = useState(false);
    const [pressed, setPressed] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [expandedWidth, setExpandedWidth] = useState(MIN_EXPANDED_WIDTH);
    const measureRef = useRef<HTMLSpanElement>(null);
    const collapseTimer = useRef<number | null>(null);
    const clearTimer = useRef<number | null>(null);
    const undoRef = useRef<(() => void) | null>(null);
    const dismissRef = useRef<(() => void) | null>(null);

    const clearTimers = useCallback(() => {
      if (collapseTimer.current !== null) {
        window.clearTimeout(collapseTimer.current);
        collapseTimer.current = null;
      }
      if (clearTimer.current !== null) {
        window.clearTimeout(clearTimer.current);
        clearTimer.current = null;
      }
    }, []);

    const collapse = useCallback(
      (opts: { triggerDismiss: boolean }) => {
        clearTimers();
        setConfirming(false);
        const dismiss = dismissRef.current;
        undoRef.current = null;
        dismissRef.current = null;
        if (opts.triggerDismiss && dismiss) dismiss();
        clearTimer.current = window.setTimeout(() => {
          setConfirmText('');
        }, COLLAPSE_MS);
      },
      [clearTimers],
    );

    useImperativeHandle(
      ref,
      () => ({
        confirm: (text, options) => {
          // If a prior confirm with a pending dismiss was interrupted, fire it first.
          if (dismissRef.current) dismissRef.current();
          clearTimers();
          undoRef.current = options?.onUndo ?? null;
          dismissRef.current = options?.onDismiss ?? null;
          setConfirmText(text);
          setConfirming(true);
          const hold = options?.holdMs ?? DEFAULT_HOLD_MS;
          collapseTimer.current = window.setTimeout(
            () => collapse({ triggerDismiss: true }),
            EXPAND_MS + hold,
          );
        },
      }),
      [clearTimers, collapse],
    );

    useEffect(() => clearTimers, [clearTimers]);

    // Measure confirmText width and size the expanded FAB to fit, capped at the
    // viewport so long messages don't overflow the screen.
    useLayoutEffect(() => {
      if (!confirmText || !measureRef.current) return;
      const textWidth = measureRef.current.getBoundingClientRect().width;
      const required = TEXT_LEFT_PADDING + textWidth + TEXT_BUFFER + TEXT_RIGHT_GAP + COLLAPSED_WIDTH;
      const cap = (typeof window !== 'undefined' ? window.innerWidth : 360) - VIEWPORT_MARGIN * 2;
      setExpandedWidth(Math.min(cap, Math.max(MIN_EXPANDED_WIDTH, Math.ceil(required))));
    }, [confirmText]);

    // Keep the outgoing icon mounted for the length of the cross-fade so the
    // + ↔ ✓ swap morphs. Dropped back to a single layer once it has faded.
    const [prevIcon, setPrevIcon] = useState(icon);
    useEffect(() => {
      if (icon === prevIcon) return;
      const id = window.setTimeout(() => setPrevIcon(icon), GLYPH_MORPH_MS);
      return () => window.clearTimeout(id);
    }, [icon, prevIcon]);

    const hasUndo = confirming && undoRef.current !== null;
    const width = confirming ? expandedWidth : COLLAPSED_WIDTH;
    const pressable = !(disabled && !confirming);

    const handleClick = () => {
      if (confirming) {
        if (undoRef.current) {
          const undo = undoRef.current;
          collapse({ triggerDismiss: false });
          undo();
        }
        return;
      }
      if (disabled) return;
      onClick();
    };

    return (
      <button
        type="button"
        onClick={handleClick}
        onPointerDown={() => pressable && setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        aria-label={confirming ? (hasUndo ? `${confirmText}. Tap to undo.` : confirmText) : ariaLabel}
        disabled={disabled && !confirming}
        className="morphing-fab"
        style={{
          width,
          height: COLLAPSED_WIDTH,
          borderRadius: RADIUS,
          transform: pressed ? 'scale(0.92)' : 'scale(1)',
          // ponytail: press uses a snappier ease-out for release; width keeps its own curve.
          transition: `width ${confirming ? EXPAND_MS : COLLAPSE_MS}ms cubic-bezier(0.32, 0.72, 0, 1), transform ${pressed ? 120 : 260}ms cubic-bezier(0.23, 1, 0.32, 1)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: 0,
          position: 'relative',
          border: 'none',
          cursor: 'pointer',
          background: disabled && !confirming ? '#92949c' : undefined,
          boxShadow: '0 4px 16px -4px hsl(0 0% 0% / 0.2), 0 2px 8px -2px hsl(0 0% 0% / 0.15)',
          willChange: 'width',
          overflow: 'hidden',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span
          aria-hidden={!confirming}
          style={{
            position: 'absolute',
            left: TEXT_LEFT_PADDING,
            right: COLLAPSED_WIDTH - TEXT_RIGHT_GAP,
            textAlign: 'left',
            fontSize: 16,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            opacity: confirming ? 1 : 0,
            transform: confirming ? 'translateX(0)' : 'translateX(-6px)',
            transition: `opacity ${confirming ? EXPAND_MS : COLLAPSE_MS / 2}ms ease ${confirming ? EXPAND_MS / 2 : 0}ms, transform ${confirming ? EXPAND_MS : COLLAPSE_MS / 2}ms cubic-bezier(0.32, 0.72, 0, 1) ${confirming ? EXPAND_MS / 2 : 0}ms`,
            pointerEvents: 'none',
          }}
        >
          {confirmText}
        </span>

        {/* Hidden mirror used to measure the natural text width so the FAB
            expands just enough to fit the message. Inherits the page's font
            so the measurement matches the visible label glyph metrics. */}
        <span
          ref={measureRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: -9999,
            top: -9999,
            visibility: 'hidden',
            whiteSpace: 'nowrap',
            fontFamily: 'inherit',
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: 'inherit',
            pointerEvents: 'none',
          }}
        >
          {confirmText}
        </span>

        <span
          style={{
            width: COLLAPSED_WIDTH,
            height: COLLAPSED_WIDTH,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* Glyphs are stacked and cross-fade between states so the +/✓ morphs
              rather than hard-cutting. Each layer counter-rotates + scales as it
              swaps. ease-out so the incoming glyph lands with immediate presence. */}
          {[
            ...(prevIcon === icon ? [icon] : [prevIcon, icon]).map((ic) => ({
              key: `idle:${ic}`,
              active: (c: boolean) => !c && ic === icon,
              render: () => <IonIcon icon={ic} style={{ fontSize: 40 }} />,
            })),
            ...GLYPHS,
          ].map(({ key, active, render }) => {
            const shown = active(confirming, hasUndo);
            return (
              <span
                key={key}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: shown ? 1 : 0,
                  transform: shown ? 'scale(1) rotate(0deg)' : 'scale(0.6) rotate(-45deg)',
                  transition:
                    'opacity 200ms ease, transform 280ms cubic-bezier(0.23, 1, 0.32, 1)',
                  pointerEvents: 'none',
                }}
              >
                {render(icon)}
              </span>
            );
          })}
        </span>
      </button>
    );
  },
);

MorphingFab.displayName = 'MorphingFab';
