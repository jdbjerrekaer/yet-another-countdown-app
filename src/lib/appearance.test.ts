import { describe, expect, it } from 'vitest';
import { getHueFromEmojiColor, getTintedBackground, hexToHSL } from './colorPalette';
import { EMOJI_SHAPES, normalizeShape, shapeMaskStyle } from './emojiShapes';

describe('countdown appearance', () => {
  it('supports every emoji container shape and safely defaults unknown values', () => {
    for (const shape of EMOJI_SHAPES) expect(normalizeShape(shape)).toBe(shape);
    expect(normalizeShape(undefined)).toBe('squircle');
    expect(normalizeShape('star')).toBe('squircle');
  });

  it('uses masks only for non-rounded-box shapes', () => {
    expect(shapeMaskStyle('circle')).toBeNull();
    expect(shapeMaskStyle('squircle')).toBeNull();
    for (const shape of ['heart', 'flower', 'hexagon'] as const) {
      expect(shapeMaskStyle(shape)?.maskImage).toContain('data:image/svg+xml');
    }
  });

  it('derives stable hues and tinted backgrounds from selected colors', () => {
    expect(hexToHSL('#ff0000')).toEqual({ h: 0, s: 100, l: 50 });
    expect(getHueFromEmojiColor('#00ff00')).toBe(120);
    expect(getTintedBackground('#0000ff', true)).toBe('hsl(240, 35%, 92%)');
    expect(getTintedBackground('#0000ff', false)).toBe('hsl(240, 40%, 18%)');
  });
});
