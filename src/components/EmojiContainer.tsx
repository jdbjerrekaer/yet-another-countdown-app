import type { CSSProperties, ReactNode } from 'react';
import { EmojiShape, shapeMaskStyle, normalizeShape } from '@/lib/emojiShapes';

// Fallback when an event has no chosen color (mirrors the .gradient-accent look).
const ACCENT_GRADIENT = 'linear-gradient(135deg, hsl(262 83% 58%), hsl(199 89% 48%))';

// Per-shape footprint multiplier so every shape reads the same visual size. A
// squircle fills its box (incl. corners) so it looks largest at 1.0; the others
// leave space around their silhouette, so they're scaled up — some past 1.0
// (small overflow) to give the emoji inside room to breathe. Tunable.
const FILL: Record<EmojiShape, number> = {
  squircle: 1.0, // matches the full-size emoji tiles in the grid
  circle: 1.05,
  heart: 1.14,
  hexagon: 1.16,
  flower: 1.06,
};

// Selection: a white outline (a second, larger white copy of the shape behind the
// colored one) plus a soft shadow on the wrapper. The shadow separates the white
// ring from the white popover so the outline is actually visible.
const SELECT_SHADOW = 'drop-shadow(0 2px 5px rgba(0,0,0,0.3))';
const RING_SCALE = 1.13;

interface Props {
  shape?: EmojiShape | string;
  color?: string; // hex; falls back to the accent gradient when absent
  emoji: string;
  size: number; // px footprint
  radius?: number; // squircle corner radius (px) at full size
  selected?: boolean; // draw the white ticker-style outline that traces the shape
  emojiClassName?: string;
  animateIn?: boolean; // gentle scale/opacity pop when it appears (selection morph)
  children?: ReactNode;
  style?: CSSProperties;
}

export function EmojiContainer({
  shape,
  color,
  emoji,
  size,
  radius,
  selected,
  emojiClassName = 'text-2xl',
  animateIn,
  children,
  style,
}: Props) {
  const s = normalizeShape(shape);
  const mask = shapeMaskStyle(s);
  const background = color || ACCENT_GRADIENT;
  const dim = size * FILL[s];
  const cornerRadius = s === 'circle' ? dim / 2 : (radius ?? size * 0.26) * FILL[s];
  const bgTransition = 'background-color 220ms ease-out, background 220ms ease-out';

  // One copy of the shape. `bg` is the fill; `scale` (>1) draws the larger white
  // outline behind the colored copy.
  const layer = (bg: string, scale?: number) => {
    const base: CSSProperties = {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: dim,
      height: dim,
      transform: `translate(-50%, -50%)${scale ? ` scale(${scale})` : ''}`,
      transformOrigin: 'center',
      background: bg,
      transition: scale ? undefined : bgTransition,
    };
    return <div style={mask ? { ...base, ...mask } : { ...base, borderRadius: cornerRadius }} />;
  };

  return (
    <div
      className={`flex items-center justify-center flex-shrink-0 relative ${animateIn ? 'emoji-shape-pop' : ''}`}
      style={{ width: size, height: size, ...style }}
    >
      {/* Filter lives on the wrapper so the shadow traces the masked alpha (not clipped by the mask). */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          filter: selected ? SELECT_SHADOW : undefined,
          transition: 'filter 160ms ease-out',
        }}
      >
        {selected && layer('#fff', RING_SCALE)}
        {layer(background)}
      </div>
      <span className={emojiClassName} style={{ position: 'relative' }}>
        {emoji}
      </span>
      {children}
    </div>
  );
}
