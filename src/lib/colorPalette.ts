// Discrete color palette - curated colors similar to reference image
export const COLOR_PALETTE = [
  // Magentas/Pinks
  '#c94b8c',
  '#b8428a',
  '#a73d87',
  // Purples
  '#9638a0',
  '#8533b8',
  '#7430bf',
  // Deep Purple
  '#6030bf',
  '#5030bf',
  '#4030bf',
  // Blues
  '#3050bf',
  '#3070bf',
  '#3090bf',
  // Cyans
  '#30b0bf',
  '#30bfb0',
  // Teals/Greens
  '#30bf80',
  '#30bf50',
  '#40bf40',
  // Yellow-Greens
  '#70bf40',
  '#a0bf40',
  // Yellows
  '#bfbf40',
  '#bfa040',
  // Oranges
  '#bf8040',
  '#bf6040',
  // Reds
  '#bf4040',
  '#bf4060',
  // Back to pinks
  '#bf4080',
  '#c04090',
];

/**
 * Convert hex color to HSL values
 * @param hex - Hex color string (e.g., '#c94b8c')
 * @returns Object with h (0-360), s (0-100), l (0-100)
 */
export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  
  let h = 0;
  let s = 0;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Get the hue value from an emoji color (hex string)
 * @param emojiColor - Hex color string from the color picker
 * @returns Hue value (0-360)
 */
export function getHueFromEmojiColor(emojiColor: string): number {
  const { h } = hexToHSL(emojiColor);
  return h;
}

/**
 * Generate tinted background style for iOS 26-style widget appearance
 * Uses subtle saturation and appropriate lightness based on the emoji color
 * @param emojiColor - Hex color from the emoji color picker
 * @param isLight - Whether to generate a light or dark tinted background
 * @returns CSS background color string in HSL format
 */
export function getTintedBackground(emojiColor: string | undefined, isLight: boolean = true): string {
  // Default to a neutral blue if no color provided
  const hue = emojiColor ? getHueFromEmojiColor(emojiColor) : 210;
  
  // iOS 26 style: subtle saturation, appropriate lightness
  // Light mode: high lightness, moderate saturation for visibility
  // Dark mode: low lightness, higher saturation for visibility
  if (isLight) {
    return `hsl(${hue}, 35%, 92%)`;
  } else {
    return `hsl(${hue}, 40%, 18%)`;
  }
}

/**
 * Get text color for tinted backgrounds to ensure proper contrast
 * @param isLight - Whether the background is light or dark
 * @returns CSS color string
 */
export function getTintedTextColor(isLight: boolean = true): string {
  return isLight ? 'hsl(0, 0%, 9%)' : 'hsl(0, 0%, 98%)';
}

/**
 * Get muted text color for tinted backgrounds
 * @param isLight - Whether the background is light or dark  
 * @returns CSS color string
 */
export function getTintedMutedColor(isLight: boolean = true): string {
  return isLight ? 'hsl(0, 0%, 45%)' : 'hsl(0, 0%, 60%)';
}
