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
// Phrases already found too wide for a container of roughly this width. The
// drag preview mounts a second copy of a card at the same width, and measuring
// each copy on its own let the two disagree — the list card read "1mo 2w 1d
// left" while the lifted preview snapped back to the spelled-out form. Sharing
// the verdict keeps every copy of the same phrase in step.
const tooWide = new Set<string>();
const verdictKey = (lang: string, phrase: string, width: number) =>
  `${lang}|${phrase}|${Math.round(width / 8)}`;

export function RelativePhrase({ target, includeTime, legacy, className }: Props) {
  const { t, i18n } = useTranslation();
  const ref = useRef<HTMLSpanElement>(null);
  const [short, setShort] = useState(false);

  const now = new Date();
  const long = formatRelative(t, target, now, includeTime, legacy);
  const brief = formatRelativeShort(t, target, now, includeTime, legacy, i18n.language);

  // New text (or language) — start from whatever a same-width sibling already
  // settled on, and only re-measure when this phrase hasn't been judged yet.
  useLayoutEffect(() => {
    const el = ref.current;
    setShort(!!el && tooWide.has(verdictKey(i18n.language, long, el.clientWidth)));
  }, [long, i18n.language]);

  // ponytail: plain overflow test, no width arithmetic. Runs pre-paint, so the
  // long form never flashes. Guarded on `short` so it settles after one swap.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || short) return;
    if (el.scrollWidth > el.clientWidth + 1) {
      // ponytail: unbounded set would creep — the text changes every minute.
      if (tooWide.size > 200) tooWide.clear();
      tooWide.add(verdictKey(i18n.language, long, el.clientWidth));
      setShort(true);
    }
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
