import { useCallback } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

/**
 * Haptic feedback intensity levels.
 * 
 * See HAPTIC_GUIDELINES.md for detailed usage guidelines:
 * - 'light': Subtle, frequent interactions (selections, navigation, minor actions)
 * - 'medium': Significant actions that commit changes (saves, edits, primary actions)
 * - 'heavy': Destructive or irreversible actions (deletions, critical warnings)
 * - 'selection': Used for selection feedback (maps to light impact)
 */
type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection';

/**
 * Hook for providing haptic feedback across platforms.
 * 
 * Automatically handles platform differences:
 * - Native (iOS/Android): Uses Capacitor Haptics API
 * - Web: Falls back to navigator.vibrate with appropriate durations
 * 
 * @returns Object with trigger function for haptic feedback
 * 
 * @example
 * ```tsx
 * const { trigger } = useHaptic();
 * 
 * // Light: Simple selection
 * trigger('light');
 * 
 * // Medium: Save action
 * trigger('medium');
 * 
 * // Heavy: Delete confirmation
 * trigger('heavy');
 * ```
 * 
 * @see HAPTIC_GUIDELINES.md for detailed usage guidelines
 */
export function useHaptic() {
  /**
   * Triggers haptic feedback with the specified intensity level.
   * 
   * @param style - The intensity level ('light' | 'medium' | 'heavy' | 'selection')
   *                Defaults to 'light' if not specified.
   * 
   * @see HAPTIC_GUIDELINES.md for when to use each level
   */
  const trigger = useCallback(async (style: HapticStyle = 'light') => {
    // Use native Capacitor haptics on iOS/Android
    if (Capacitor.isNativePlatform()) {
      try {
        // Map all styles to impact styles for more reliable haptic feedback
        const impactStyles: Record<HapticStyle, ImpactStyle> = {
          light: ImpactStyle.Light,
          medium: ImpactStyle.Medium,
          heavy: ImpactStyle.Heavy,
          selection: ImpactStyle.Light, // Use light impact for selection (more reliable than selectionStart/End)
        };
        await Haptics.impact({ style: impactStyles[style] });
        return;
      } catch (e) {
        // Fall through to web fallback
        console.warn('Haptics not available:', e);
      }
    }

    // Web fallback: Try navigator.vibrate
    if ('vibrate' in navigator) {
      const durations: Record<HapticStyle, number> = {
        light: 10,
        medium: 20,
        heavy: 30,
        selection: 5,
      };
      navigator.vibrate(durations[style]);
    }
    
    // Add visual haptic feedback animation (for web)
    document.documentElement.style.setProperty('--haptic-scale', '0.98');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--haptic-scale', '1');
      });
    });
  }, []);

  return { trigger };
}
