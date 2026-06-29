import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EMOJI_SHAPES, EmojiShape, normalizeShape } from '@/lib/emojiShapes';
import { EmojiContainer } from '@/components/EmojiContainer';
import { useHaptic } from '@/hooks/useHaptic';

// The selected-emoji tile; long-press (drag to highlight, release to select) or
// double-tap opens a portal popover of container-shape previews — same feel as
// the hue selector.
interface Props {
  shape: EmojiShape | string;
  color: string;
  emoji: string;
  onChange: (shape: EmojiShape) => void;
  size?: number;
}

const ITEM = 56;
const GAP = 16;
const STEP = ITEM + GAP;

export function EmojiShapePicker({ shape, color, emoji, onChange, size = 56 }: Props) {
  const { trigger } = useHaptic();
  const active = normalizeShape(shape);
  const triggerRef = useRef<HTMLDivElement>(null);

  const [menu, setMenu] = useState<{ cx: number; cy: number } | null>(null);
  const [shown, setShown] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const openRef = useRef(false);
  const dragRef = useRef(false);
  const hoverRef = useRef<number | null>(null);
  const centerRef = useRef<{ cx: number; cy: number } | null>(null);
  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef<number | null>(null);

  const close = useCallback(() => {
    openRef.current = false;
    dragRef.current = false;
    hoverRef.current = null;
    setHover(null);
    setShown(false);
    window.setTimeout(() => setMenu(null), 200);
  }, []);

  const select = useCallback(
    (s: EmojiShape) => {
      trigger('selection');
      onChange(s);
      close();
    },
    [onChange, trigger, close]
  );

  const hitTest = useCallback((clientX: number, clientY: number): number | null => {
    const c = centerRef.current;
    if (!c) return null;
    const half = (EMOJI_SHAPES.length * ITEM + (EMOJI_SHAPES.length - 1) * GAP) / 2;
    if (Math.abs(clientX - c.cx) > 110) return null;
    if (clientY < c.cy - half - 40 || clientY > c.cy + half + 40) return null;
    let best = 0;
    let bestD = Infinity;
    const mid = (EMOJI_SHAPES.length - 1) / 2;
    for (let i = 0; i < EMOJI_SHAPES.length; i++) {
      const cy = c.cy + (i - mid) * STEP;
      const d = Math.abs(clientY - cy);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }, []);

  const onDragMove = useCallback(
    (e: PointerEvent) => {
      if (!dragRef.current) return;
      const idx = hitTest(e.clientX, e.clientY);
      if (idx !== hoverRef.current) {
        hoverRef.current = idx;
        setHover(idx);
        if (idx !== null) trigger('selection');
      }
    },
    [hitTest, trigger]
  );

  const onDragUp = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = false;
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragUp);
    window.removeEventListener('pointercancel', onDragUp);
    const idx = hoverRef.current;
    if (idx !== null) select(EMOJI_SHAPES[idx]);
    else close();
  }, [onDragMove, select, close]);

  const open = useCallback(
    (drag: boolean) => {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      centerRef.current = { cx, cy };
      openRef.current = true;
      dragRef.current = drag;
      const startIdx = EMOJI_SHAPES.indexOf(active);
      hoverRef.current = drag ? (startIdx < 0 ? 0 : startIdx) : null;
      setHover(hoverRef.current);
      setMenu({ cx, cy });
      setShown(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      trigger('selection');
      if (drag) {
        window.addEventListener('pointermove', onDragMove);
        window.addEventListener('pointerup', onDragUp);
        window.addEventListener('pointercancel', onDragUp);
      }
    },
    [active, onDragMove, onDragUp, trigger]
  );

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onDragMove);
      window.removeEventListener('pointerup', onDragUp);
      window.removeEventListener('pointercancel', onDragUp);
    };
  }, [onDragMove, onDragUp]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      pressStart.current = { x: e.clientX, y: e.clientY };
      if (pressTimer.current) clearTimeout(pressTimer.current);
      pressTimer.current = window.setTimeout(() => {
        pressTimer.current = null;
        open(true);
      }, 450);
    },
    [open]
  );
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pressTimer.current || !pressStart.current) return;
    if (Math.abs(e.clientX - pressStart.current.x) > 8 || Math.abs(e.clientY - pressStart.current.y) > 8) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);
  const endPress = useCallback(() => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  }, []);
  const onClick = useCallback(() => {
    if (openRef.current) return;
    const now = Date.now();
    if (lastTap.current && now - lastTap.current < 320) {
      lastTap.current = null;
      open(false);
      return;
    }
    lastTap.current = now;
  }, [open]);

  return (
    <div
      ref={triggerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPress}
      onPointerLeave={endPress}
      onPointerCancel={endPress}
      onClick={onClick}
      className="active:scale-[0.97] transition-transform"
      style={{ touchAction: 'none' }}
      aria-label="Change emoji container shape"
    >
      <EmojiContainer shape={active} color={color} emoji={emoji} size={size} animateIn emojiClassName="text-xl" />

      {menu && typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[60]">
            <div className="absolute inset-0" onClick={close} />
            <div
              className="absolute flex flex-col items-center bg-popover border border-border"
              style={{
                left: menu.cx,
                top: menu.cy,
                gap: GAP,
                padding: 18,
                borderRadius: 32,
                boxShadow: '0 12px 36px rgba(0,0,0,0.28)',
                transformOrigin: 'center',
                transform: `translate(-50%, -50%) scale(${shown ? 1 : 0.9})`,
                opacity: shown ? 1 : 0,
                transition:
                  'transform 240ms cubic-bezier(0.23, 1, 0.32, 1), opacity 180ms cubic-bezier(0.23, 1, 0.32, 1)',
              }}
            >
              {EMOJI_SHAPES.map((s, i) => {
                const mid = (EMOJI_SHAPES.length - 1) / 2;
                const fromCenter = i - mid;
                const isActive = hover !== null ? hover === i : s === active;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => select(s)}
                    aria-label={`Shape ${s}`}
                    style={{
                      transform: shown
                        ? `translateY(0) scale(${hover === i ? 1.06 : 1})`
                        : `translateY(${-fromCenter * STEP}px) scale(0.82)`,
                      opacity: shown ? 1 : isActive ? 1 : 0,
                      transition:
                        'transform 220ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms cubic-bezier(0.23, 1, 0.32, 1)',
                      transitionDelay: `${Math.abs(fromCenter) * 22}ms`,
                    }}
                  >
                    <EmojiContainer
                      shape={s}
                      color={color}
                      emoji={emoji}
                      size={ITEM}
                      selected={isActive}
                      emojiClassName="text-xl"
                    />
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
