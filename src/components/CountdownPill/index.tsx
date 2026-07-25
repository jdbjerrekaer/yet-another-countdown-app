import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatRelative, formatRelativeShort } from '@/lib/relativeTime';

interface Props {
  /** The event's target instant, or null to hide the pill. */
  target: Date | null;
  includeTime: boolean;
  legacy: boolean;
}

// Mirrors MorphingFab's shell so the pair reads as one control split across the
// screen's centre line.
const HEIGHT = 72;
const RADIUS = 18;
const PADDING_X = 24;
const ENTER_MS = 340;
// Value swap: box resize and text crossfade share a duration so they read as
// one motion. Matches the keyframes in _components.scss.
const SWAP_MS = 220;
const SWAP_EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

/**
 * Read-only companion to the edit FAB: shows how long is left / how long ago,
 * pinned opposite the FAB at the same height. Flies in from the left on open
 * and back out the same way. Falls back to narrow units ("4mo 4w left") when
 * the spelled-out phrase doesn't fit, matching the lock-screen accessory.
 */
export function CountdownPill({ target, includeTime, legacy }: Props) {
  const { t, i18n } = useTranslation();
  const [shown, setShown] = useState(false);
  const [short, setShort] = useState(false);
  const measureRef = useRef<HTMLSpanElement>(null);
  const sizeRef = useRef<HTMLSpanElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const long = target ? formatRelative(t, target, now, includeTime, legacy) : '';
  const brief = target ? formatRelativeShort(t, target, now, includeTime, legacy, i18n.language) : '';
  // Hold the last phrase through the exit animation so the pill doesn't blank
  // out as it slides away.
  const lastText = useRef('');
  if (target) lastText.current = short ? brief : long;
  const text = lastText.current;

  // The value currently on screen, plus the one it replaced — both are rendered
  // during the swap so the change crossfades instead of cutting.
  const [current, setCurrent] = useState(text);
  const [outgoing, setOutgoing] = useState<string | null>(null);
  const [swapId, setSwapId] = useState(0);
  const [width, setWidth] = useState<number>();

  useLayoutEffect(() => {
    if (!text || text === current) return;
    setOutgoing(current);
    setCurrent(text);
    setSwapId((n) => n + 1);
  }, [text, current]);

  // Retire the outgoing layer once its animation has played.
  useEffect(() => {
    if (outgoing === null) return;
    const id = setTimeout(() => setOutgoing(null), SWAP_MS);
    return () => clearTimeout(id);
  }, [outgoing, swapId]);

  // Size the box to the incoming value so it can transition between widths —
  // `auto` isn't animatable, same reason MorphingFab measures its own label.
  useLayoutEffect(() => {
    if (sizeRef.current) setWidth(sizeRef.current.scrollWidth + PADDING_X * 2);
  }, [current, i18n.language]);

  useEffect(() => {
    if (!target) {
      setShown(false);
      return;
    }
    // Next frame, so the element mounts off-screen and then transitions in.
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [target]);

  // ponytail: one measurement against the space left of the FAB decides which
  // wording to use. No breakpoint table.
  // offsetLeft, not getBoundingClientRect: the pill is still translated
  // off-screen for the fly-in on this pass, and a transformed rect would report
  // a negative left — making everything look like it fits, then snapping to the
  // short form a frame later.
  useLayoutEffect(() => {
    const el = measureRef.current;
    const box = boxRef.current;
    if (!target || !el || !box) return;
    const available = window.innerWidth - box.offsetLeft - 72 - 32;
    setShort(el.scrollWidth + PADDING_X * 2 > available);
  }, [target, long, i18n.language]);

  if (!target && !text) return null;

  const layerStyle: React.CSSProperties = {
    position: 'absolute',
    left: PADDING_X,
    whiteSpace: 'nowrap',
    willChange: 'transform, opacity, filter',
  };

  return (
    <div
      ref={boxRef}
      aria-live="polite"
      style={{
        position: 'fixed',
        left: 'calc(16px + env(safe-area-inset-left))',
        bottom: 'calc(16px + env(safe-area-inset-bottom) + 56px)',
        zIndex: 100000,
        height: HEIGHT,
        width,
        maxWidth: 'calc(100vw - 120px)',
        borderRadius: RADIUS,
        display: 'flex',
        alignItems: 'center',
        fontSize: 15,
        fontWeight: 500,
        overflow: 'hidden',
        // Swallows taps rather than letting them through to the sheet
        // underneath — nothing behind a 72pt block should be hit by accident.
        // No handler, so it stays inert.
        pointerEvents: shown && target ? 'auto' : 'none',
        cursor: 'default',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        // Deliberately unelevated: the FAB casts a shadow because it's
        // pressable, this sits flat on the surface because it isn't.
        opacity: shown && target ? 1 : 0,
        transform: shown && target ? 'translateX(0)' : 'translateX(calc(-100% - 24px))',
        transition:
          `transform ${ENTER_MS}ms cubic-bezier(0.32, 0.72, 0, 1)` +
          `, opacity ${ENTER_MS}ms ease` +
          `, width ${SWAP_MS}ms ${SWAP_EASE}`,
      }}
      className="countdown-pill"
    >
      {/* Keyed so each new value mounts fresh and replays its enter animation. */}
      <span key={swapId} className="countdown-pill-in" style={layerStyle}>
        {current}
      </span>
      {outgoing !== null && (
        <span key={`out-${swapId}`} aria-hidden="true" className="countdown-pill-out" style={layerStyle}>
          {outgoing}
        </span>
      )}

      {/* Hidden mirrors: natural width of the spelled-out phrase (to decide
          whether it fits) and of the displayed one (to size the box). */}
      <span ref={measureRef} aria-hidden="true" style={{ ...layerStyle, visibility: 'hidden' }}>
        {long}
      </span>
      <span ref={sizeRef} aria-hidden="true" style={{ ...layerStyle, visibility: 'hidden' }}>
        {current}
      </span>
    </div>
  );
}
