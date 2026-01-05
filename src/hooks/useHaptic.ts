import { useCallback } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection';

export function useHaptic() {
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
