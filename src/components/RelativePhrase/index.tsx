import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatRelative, formatRelativeShort } from '@/lib/relativeTime';

interface Props {
  target: Date;
  includeTime: boolean;
  legacy: boolean;
  className?: string;
}

/**
 * "35 days, 7 hours, 26 minutes ago", falling back to "35d 7h 26m ago" when the
 * spelled-out phrase doesn't fit its container. Mirrors the lock-screen
 * accessory's behaviour: how wide a phrase renders depends on the words, not the
 * unit count, so the only reliable test is to lay it out and look.
 *
 * The element must be allowed to shrink (min-width: 0 in a flex row) — a
 * shrink-proof box never reports overflow, it just clips.
 */
export function RelativePhrase({ target, includeTime, legacy, className }: Props) {
  const { t, i18n } = useTranslation();
  const ref = useRef<HTMLSpanElement>(null);
  const [short, setShort] = useState(false);

  const now = new Date();
  const long = formatRelative(t, target, now, includeTime, legacy);
  const brief = formatRelativeShort(t, target, now, includeTime, legacy, i18n.language);

  // New text (or language) — re-measure from the spelled-out form.
  useLayoutEffect(() => setShort(false), [long, i18n.language]);

  // ponytail: plain overflow test, no width arithmetic. Runs pre-paint, so the
  // long form never flashes. Guarded on `short` so it settles after one swap.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || short) return;
    if (el.scrollWidth > el.clientWidth + 1) setShort(true);
  });

  return (
    <span
      ref={ref}
      className={className}
      style={{
        minWidth: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        // Shrinkable while it still has a shorter form to fall back to; once
        // it's already short, stop yielding so siblings (e.g. the calendar-name
        // badge) truncate instead of clipping the countdown itself.
        flexShrink: short ? 0 : 1,
      }}
    >
      {short ? brief : long}
    </span>
  );
}
