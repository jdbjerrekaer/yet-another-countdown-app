// Emoji-container shapes. Squircle and circle render as rounded boxes; heart,
// flower, star and hexagon are rendered by masking the colored background with a
// scalable SVG. Squircle sits in the middle of the picker (it's the default).
import type { CSSProperties } from 'react';

export const EMOJI_SHAPES = ['circle', 'hexagon', 'squircle', 'heart', 'flower'] as const;
export type EmojiShape = (typeof EMOJI_SHAPES)[number];

const KNOWN = new Set<string>(EMOJI_SHAPES);
export function normalizeShape(s: string | undefined | null): EmojiShape {
  return s && KNOWN.has(s) ? (s as EmojiShape) : 'squircle';
}

// --- Path builders (run once at module load; pure geometry, no Date/random) ---
type P = [number, number];
const r2 = (n: number) => Math.round(n * 100) / 100;
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const f = (p: P) => `${r2(p[0])} ${r2(p[1])}`;

// Regular-polygon vertices around center (50,50) in a 0..100 viewBox.
function polyVerts(sides: number, r: number, rot: number): P[] {
  return Array.from({ length: sides }, (_, i) => {
    const a = rot + (i * 2 * Math.PI) / sides;
    return [50 + r * Math.cos(a), 50 + r * Math.sin(a)] as P;
  });
}
// Connect verts with corners rounded by quadratic curves (t = fraction of each edge).
function roundedPath(verts: P[], t: number): string {
  const n = verts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const prev = verts[(i - 1 + n) % n];
    const cur = verts[i];
    const next = verts[(i + 1) % n];
    const entry = lerp(cur, prev, t);
    const exit = lerp(cur, next, t);
    d += (i === 0 ? `M ${f(entry)}` : ` L ${f(entry)}`) + ` Q ${f(cur)} ${f(exit)}`;
  }
  return d + ' Z';
}

// Classic fat heart — wide, bulging lower half tapering to a soft bottom point.
const HEART_PATH =
  'M50 94 C 28 78 6 61 6 37 C 6 19 20 8 32 8 C 41 8 47 15 50 24 C 53 15 59 8 68 8 C 80 8 94 19 94 37 C 94 61 72 78 50 94 Z';
// Rounded hexagon (point up).
const HEXAGON_PATH = roundedPath(polyVerts(6, 48, -Math.PI / 2), 0.32);

function svg(inner: string): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>${inner}</svg>`;
}
const HEART_SVG = svg(`<path d='${HEART_PATH}' fill='black'/>`);
const HEXAGON_SVG = svg(`<path d='${HEXAGON_PATH}' fill='black'/>`);
// Six rounded petals around a center circle (iOS-Photos-style flower).
const FLOWER_SVG = svg(
  "<g fill='black'><circle cx='50' cy='25' r='22'/><circle cx='71' cy='37' r='22'/><circle cx='71' cy='63' r='22'/><circle cx='50' cy='75' r='22'/><circle cx='29' cy='63' r='22'/><circle cx='29' cy='37' r='22'/><circle cx='50' cy='50' r='28'/></g>"
);

function maskFor(svgStr: string): CSSProperties {
  const url = `url("data:image/svg+xml,${encodeURIComponent(svgStr)}")`;
  return {
    WebkitMaskImage: url,
    maskImage: url,
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
  };
}

const MASKS: Partial<Record<EmojiShape, CSSProperties>> = {
  heart: maskFor(HEART_SVG),
  flower: maskFor(FLOWER_SVG),
  hexagon: maskFor(HEXAGON_SVG),
};

// CSS mask props for a non-square shape, or null for circle/squircle (use border-radius).
export function shapeMaskStyle(shape: EmojiShape): CSSProperties | null {
  return MASKS[shape] ?? null;
}
