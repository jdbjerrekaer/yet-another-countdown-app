import { Capacitor } from '@capacitor/core';

/**
 * iOS widget sizes are proportional to screen width.
 * This module calculates widget dimensions dynamically based on the device screen.
 * 
 * Reference: https://developer.apple.com/design/human-interface-guidelines/widgets
 * 
 * iOS Widget Size Formulas (approximate based on Apple's specifications):
 * - Small widget: ~41% of screen width (square)
 * - Medium widget: ~87% of screen width, same height as small
 * - Large widget: ~87% of screen width, height ≈ 2.1x small height
 */

export interface WidgetDimensions {
  width: number;
  height: number;
}

export interface AllWidgetSizes {
  small: WidgetDimensions;
  medium: WidgetDimensions;
  large: WidgetDimensions;
}

// Web preview sizes (fixed, for consistent appearance on web)
const WEB_SIZES: AllWidgetSizes = {
  small: { width: 158, height: 158 },
  medium: { width: 338, height: 170 },
  large: { width: 338, height: 354 },
};

/**
 * Calculate native widget sizes based on actual screen width
 * Uses iOS widget size ratios relative to screen width
 * 
 * Updated for iOS 26 / iPhone 17 Pro with taller widget heights
 */
function calculateNativeSizes(): AllWidgetSizes {
  const screenWidth = typeof window !== 'undefined' ? window.screen.width : 390;
  
  // iOS widget size ratios (based on Apple's widget specifications)
  // Small widget is approximately 41% of screen width
  const smallWidth = Math.round(screenWidth * 0.413);
  const smallHeight = smallWidth; // Small widgets are square
  
  // Medium widget is approximately 87% of screen width
  // Height is taller than small - approximately 2.60x small height
  const mediumWidth = Math.round(screenWidth * 0.867);
  const mediumHeight = Math.round(smallHeight * 2.60);
  
  // Large widget is same width as medium, height is approximately 2.35x small
  const largeWidth = mediumWidth;
  const largeHeight = Math.round(smallHeight * 2.35);
  
  return {
    small: { width: smallWidth, height: smallHeight },
    medium: { width: mediumWidth, height: mediumHeight },
    large: { width: largeWidth, height: largeHeight },
  };
}

/**
 * Get widget sizes based on platform
 * Returns dynamically calculated sizes for native, fixed sizes for web
 */
export function getWidgetSizes(): AllWidgetSizes {
  if (Capacitor.isNativePlatform()) {
    return calculateNativeSizes();
  }
  return WEB_SIZES;
}

/**
 * Get size classes for a specific widget type
 * Returns Tailwind classes with width and height
 */
export function getWidgetSizeClasses(size: keyof AllWidgetSizes): string {
  const sizes = getWidgetSizes();
  const dim = sizes[size];
  return `w-[${dim.width}px] h-[${dim.height}px]`;
}

/**
 * Get inline styles for widget dimensions
 * Useful when dynamic class names aren't supported
 */
export function getWidgetSizeStyles(size: keyof AllWidgetSizes): { width: string; height: string } {
  const sizes = getWidgetSizes();
  const dim = sizes[size];
  return {
    width: `${dim.width}px`,
    height: `${dim.height}px`,
  };
}

/**
 * Get the current device info (for debugging)
 */
export function getDeviceInfo(): string {
  const screenWidth = typeof window !== 'undefined' ? window.screen.width : 0;
  const isNative = Capacitor.isNativePlatform();
  const sizes = getWidgetSizes();
  
  return `${isNative ? 'Native' : 'Web'} (${screenWidth}pt) - Small: ${sizes.small.width}x${sizes.small.height}, Medium: ${sizes.medium.width}x${sizes.medium.height}`;
}
